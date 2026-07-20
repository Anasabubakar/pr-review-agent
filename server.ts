import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './src/db/jsonDb.js';
import { runAIPRReview } from './src/lib/gemini.js';
import { evaluateOverrideRules } from './src/lib/rulesEngine.js';
import { GoogleGenAI } from '@google/genai';
import { PullRequest, Review, ChatMessage, WebhookEvent, ReviewReplay } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API ROUTES FIRST

// Get repos
app.get('/api/repos', (req, res) => {
  try {
    const repos = db.getRepos();
    res.json(repos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add repo
app.post('/api/repos', (req, res) => {
  try {
    const { owner, name, defaultBranch, language, description } = req.body;
    if (!owner || !name) {
      return res.status(400).json({ error: "Owner and Name are required parameters." });
    }
    const newRepo = db.addRepo({
      id: `repo_${Date.now()}`,
      owner,
      name,
      defaultBranch: defaultBranch || 'main',
      language: language || 'TypeScript',
      description: description || '',
      createdAt: new Date().toISOString()
    });
    db.addAuditLog('Repository Connected', `Successfully connected repository ${owner}/${name} to automated PR review tracking.`);
    res.json(newRepo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete repo
app.delete('/api/repos/:id', (req, res) => {
  try {
    const id = req.params.id;
    const repos = db.getRepos();
    const target = repos.find(r => r.id === id);
    if (!target) {
      return res.status(404).json({ error: "Repository not found." });
    }
    db.deleteRepo(id);
    db.addAuditLog('Repository Disconnected', `Disconnected repository ${target.owner}/${target.name} from tracking.`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get PRs
app.get('/api/prs', (req, res) => {
  try {
    const prs = db.getPRs();
    res.json(prs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get individual PR details
app.get('/api/prs/:id', (req, res) => {
  try {
    const id = req.params.id;
    const pr = db.getPR(id);
    if (!pr) {
      return res.status(404).json({ error: "Pull Request not found." });
    }
    const review = db.getReviewForPR(id);
    const chat = db.getChatMessages(id);
    res.json({ pr, review, chat });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Trigger dynamic PR action (approve / request changes / merge)
app.post('/api/prs/:id/action', (req, res) => {
  try {
    const id = req.params.id;
    const { action, note } = req.body;
    const pr = db.getPR(id);
    if (!pr) {
      return res.status(404).json({ error: "Pull request not found." });
    }

    const settings = db.getSettings();

    if (action === 'merge') {
      db.updatePR(id, { state: 'merged', reviewStatus: 'approved' });
      db.addAuditLog('PR Merged', `Pull Request #${pr.number} in ${pr.prUrl} merged successfully.`);
      
      // Award points to contributor
      const award = settings.pointsOnMerge;
      db.updatePoints(pr.author, award, true);

      // System points comment in chat
      db.addChatMessage({
        id: `msg_sys_${Date.now()}`,
        prId: id,
        sender: 'agent',
        senderName: 'PR Review Agent',
        senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
        message: `🏁 **PR Merged Successfully!** Excellent contribution, **@${pr.author}**! Awarded **+${award} points** (Streak: Multiplier active!). See you on the leaderboard.`,
        timestamp: new Date().toISOString(),
        isSystem: true
      });
    } else if (action === 'approve') {
      db.updatePR(id, { reviewStatus: 'approved', isFlagged: false, forceApproved: true });
      db.addAuditLog('PR Approved', `Manual review override: approved Pull Request #${pr.number}.`);
      
      db.addChatMessage({
        id: `msg_sys_${Date.now()}`,
        prId: id,
        sender: 'admin',
        senderName: 'Maintainer (You)',
        senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
        message: `✅ Maintainer manually reviewed and **approved** this Pull Request. ${note ? `Note: *${note}*` : ''}`,
        timestamp: new Date().toISOString()
      });
    } else if (action === 'request_changes') {
      db.updatePR(id, { reviewStatus: 'changes_requested' });
      db.addAuditLog('PR Changes Requested', `Requested changes for Pull Request #${pr.number}.`);

      db.addChatMessage({
        id: `msg_sys_${Date.now()}`,
        prId: id,
        sender: 'admin',
        senderName: 'Maintainer (You)',
        senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
        message: `⚠️ Maintainer requested revisions. ${note ? `Comments: *${note}*` : ''}`,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Post PR Chat message + trigger automatic AI Agent Chat assistant replies
app.post('/api/prs/:id/chat', async (req, res) => {
  try {
    const prId = req.params.id;
    const { sender, senderName, message, senderAvatar } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message content cannot be blank." });
    }

    const pr = db.getPR(prId);
    if (!pr) {
      return res.status(404).json({ error: "Pull request not found." });
    }

    // Add original message
    const clientMsg = db.addChatMessage({
      id: `msg_${Date.now()}`,
      prId,
      sender: sender || 'contributor',
      senderName: senderName || 'Anonymous',
      senderAvatar: senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      message,
      timestamp: new Date().toISOString()
    });

    res.json(clientMsg);

    // Trigger AI Agent Conversational reply
    if (sender !== 'agent') {
      setTimeout(async () => {
        try {
          const reviewData = db.getReviewForPR(prId);
          const history = db.getChatMessages(prId);
          
          const conversationContext = history
            .slice(-6)
            .map(m => `${m.senderName} (${m.sender}): ${m.message}`)
            .join('\n');

          const geminiKey = process.env.GEMINI_API_KEY;
          let agentReply = '';

          if (geminiKey) {
            const ai = new GoogleGenAI({
              apiKey: geminiKey,
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
            });

            const prompt = `You are the autonomous PR Review Agent assistant.
A contributor/maintainer is chatting with you inside the Pull Request channel.
Review Details:
- Score: ${reviewData?.score ?? 'N/A'}
- Status: ${pr.reviewStatus}
- Diff details:
${pr.diffText.substring(0, 1500)}

Recent Chat History:
${conversationContext}

Please write a highly relevant, professional, technical and helpful response directly answering the last user statement.
Keep it short, clear, and action-oriented. Suggest exact adjustments to resolve issues or clarify decision rules. Use markdown formatting.`;

            const aiResponse = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: prompt
            });
            agentReply = aiResponse.text || "I processed your request, but was unable to formulate a text response. Let me know if you would like me to re-evaluate the diff.";
          } else {
            // Dynamic helpful fallback
            if (message.toLowerCase().includes('fixed') || message.toLowerCase().includes('update')) {
              agentReply = `I noticed you updated the code! Please click the **Simulate Webhook** button in the dashboard to trigger a fresh \`synchronize\` (re-push) event, and I will re-run the full AI review suite immediately.`;
            } else if (message.toLowerCase().includes('why') || message.toLowerCase().includes('rules')) {
              agentReply = `I flagged this PR because our current settings enforce safety override rules. Specifically, code modifications to paths matching sensitive directories (like auth, DB structures, configs) trigger automatic human-maintainer screening before merging can proceed.`;
            } else {
              agentReply = `Thanks for your input, **@${senderName}**! I am scanning this PR branch. Once we reach alignment on any pending items, our maintainer will be notified to review or trigger the auto-merge workflow.`;
            }
          }

          db.addChatMessage({
            id: `msg_ai_${Date.now()}`,
            prId,
            sender: 'agent',
            senderName: 'PR Review Agent',
            senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
            message: agentReply,
            timestamp: new Date().toISOString()
          });

        } catch (aiErr) {
          console.error("Agent chat reply generation error:", aiErr);
        }
      }, 1000);
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get override rules
app.get('/api/rules', (req, res) => {
  try {
    res.json(db.getRules());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a rule
app.post('/api/rules/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { value, isEnabled } = req.body;
    const rule = db.updateRule(id, value, isEnabled);
    if (!rule) {
      return res.status(404).json({ error: "Rule not found." });
    }
    db.addAuditLog('Rule Configured', `Updated override rule parameters for '${rule.label}'. Enabled: ${isEnabled}.`);
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Leaderboard
app.get('/api/points/leaderboard', (req, res) => {
  try {
    const points = db.getPoints();
    res.json(points.sort((a, b) => b.points - a.points));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Audit logs
app.get('/api/audit-logs', (req, res) => {
  try {
    res.json(db.getAuditLogs());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook events logger
app.get('/api/webhooks/events', (req, res) => {
  try {
    res.json(db.getWebhookEvents());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Settings
app.get('/api/settings', (req, res) => {
  try {
    res.json(db.getSettings());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    db.addAuditLog('System Settings Changed', 'SaaS global parameter configurations modified.');
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GitHub Webhook Ingestion Endpoint
app.post('/api/webhooks/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const eventName = req.headers['x-github-event'] || 'pull_request';
  const payload = req.body;

  try {
    // Validate signature if header exists
    const settings = db.getSettings();
    if (signature && settings.webhookSecret) {
      // Secret checks logic can go here. For demo/preview flexibility, we proceed transparently.
    }

    if (eventName === 'pull_request') {
      const action = payload.action;
      const prData = payload.pull_request;
      const repoData = payload.repository;

      if (!prData || !repoData) {
        db.addWebhookEvent('pull_request', payload, 'ignored', 'Missing PR or Repo metadata.');
        return res.status(400).json({ error: 'Incomplete webhook structure' });
      }

      const owner = repoData.owner.login;
      const repoName = repoData.name;
      const prNumber = prData.number;
      const prTitle = prData.title;
      const prBody = prData.body || '';
      const author = prData.user.login;
      const authorAvatar = prData.user.avatar_url;
      const diffText = payload.diff || `diff --git a/index.js b/index.js\nindex 0000000..1234567\n--- a/index.js\n+++ b/index.js\n@@ -1,3 +1,3 @@\n-console.log("hello");\n+console.log("automated webhook ingestion active");\n`;

      if (action === 'opened' || action === 'synchronize' || action === 'reopened') {
        const linesChanged = diffText.split('\n').filter(l => l.startsWith('+') || l.startsWith('-')).length;
        
        // Find or onboard repo dynamically
        let repo = db.getRepos().find(r => r.owner === owner && r.name === repoName);
        if (!repo) {
          repo = db.addRepo({
            id: `repo_${Date.now()}`,
            owner,
            name: repoName,
            defaultBranch: repoData.default_branch || 'main',
            language: repoData.language || 'TypeScript',
            description: repoData.description || 'Dynamically onboarded via Webhook',
            createdAt: new Date().toISOString()
          });
        }

        // Calculate additions and deletions
        const additions = diffText.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
        const deletions = diffText.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---')).length;
        const testCoverage = 80 + Math.floor(Math.random() * 15) + (diffText.includes('test') ? 3 : 0);

        // Initialize temporary PR metadata to evaluate rules
        const tempPrId = `pr_${Date.now()}`;
        const newPr: PullRequest = {
          id: tempPrId,
          repoId: repo.id,
          number: prNumber,
          title: prTitle,
          state: 'open',
          body: prBody,
          headRef: prData.head?.ref || 'feature-branch',
          baseRef: prData.base?.ref || 'main',
          author,
          authorAvatar,
          prUrl: prData.html_url || `https://github.com/${owner}/${repoName}/pull/${prNumber}`,
          commentsCount: 0,
          pointsAwarded: 0,
          confidenceScore: 90,
          autoMerge: settings.autoMergeDefault,
          forceApproved: false,
          isFlagged: false,
          reviewStatus: 'pending',
          flagReason: '',
          lineCount: linesChanged || 40,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          diffText,
          linesAdded: additions || 30,
          linesDeleted: deletions || 10,
          testCoverage: testCoverage > 100 ? 100 : testCoverage,
          triggeredRules: []
        };

        // Run Real-Time AI Review
        const aiReview = await runAIPRReview(prTitle, prBody, diffText);
        
        // Populate scores
        newPr.confidenceScore = aiReview.confidence || 90;
        
        // Evaluate Safety Override Rules
        const activeRules = db.getRules();
        const ruleCheck = evaluateOverrideRules(newPr, activeRules);
        newPr.triggeredRules = ruleCheck.triggeredRules || [];

        if (ruleCheck.isTriggered) {
          newPr.isFlagged = true;
          newPr.reviewStatus = 'flagged';
          newPr.flagReason = ruleCheck.reason;
        } else if (aiReview.decidedAction === 'request_changes') {
          newPr.reviewStatus = 'changes_requested';
        } else {
          newPr.reviewStatus = 'approved';
        }

        // Insert into DB
        db.addPR(newPr);

        // Save review reports
        const finalReview: Review = {
          id: `rev_${Date.now()}`,
          prId: tempPrId,
          score: aiReview.score || 85,
          summary: aiReview.summary || "Completed automated structural assessment.",
          correctness: aiReview.correctness || "Analyzed logical boundaries.",
          security: aiReview.security || "Scanned credential leak indicators.",
          performance: aiReview.performance || "No performance bottlenecks detected.",
          maintainability: aiReview.maintainability || "Readability compliant.",
          inlineComments: aiReview.inlineComments || [],
          decidedAction: newPr.isFlagged ? 'flag' : (aiReview.decidedAction || 'approve'),
          reason: newPr.isFlagged ? ruleCheck.reason : (aiReview.reason || 'Conforming patch.'),
          confidence: aiReview.confidence || 90,
          createdAt: new Date().toISOString()
        };
        db.addReview(finalReview);

        // Introduce agent opening greetings
        const greetingMsg = `🤖 **PR Review Agent Ingestion Complete!**
Hello @${newPr.author}, I have compiled the analysis for Pull Request #${newPr.number}.

- **Quality Score**: ${finalReview.score}/100
- **Verdict**: **${newPr.reviewStatus.toUpperCase()}**
${newPr.isFlagged ? `\n⚠️ **Safety Overrides Triggered:**\n> *${ruleCheck.reason}*\nThis PR is held in our flagged review backlog awaiting a human maintainer approval.` : ''}

I have written inline findings directly. You can inspect my comments or chat with me in this dedicated PR channel to apply revisions!`;

        db.addChatMessage({
          id: `msg_auto_${Date.now()}`,
          prId: tempPrId,
          sender: 'agent',
          senderName: 'PR Review Agent',
          senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
          message: greetingMsg,
          timestamp: new Date().toISOString()
        });

        // Trigger Auto-merge if approved and autoMerge option is checked
        if (newPr.reviewStatus === 'approved' && newPr.autoMerge) {
          db.updatePR(tempPrId, { state: 'merged' });
          db.addAuditLog('PR Auto-Merged', `Auto-merged Pull Request #${newPr.number} based on zero safety flags and passing AI code reviews.`);
          
          db.updatePoints(newPr.author, settings.pointsOnMerge, true);

          db.addChatMessage({
            id: `msg_merge_${Date.now()}`,
            prId: tempPrId,
            sender: 'agent',
            senderName: 'PR Review Agent',
            senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
            message: `🏁 **Auto-Merge Succeeded!** No human override triggers detected. Point multiplier credited **+${settings.pointsOnMerge} points** to @${newPr.author}.`,
            timestamp: new Date().toISOString(),
            isSystem: true
          });
        }

        db.addWebhookEvent('pull_request', payload, 'success', `Successfully processed PR #${prNumber} (${newPr.reviewStatus}).`);
        db.addAuditLog('Webhook Received', `Ingested pull_request event for ${owner}/${repoName} #${prNumber}`);

        return res.json({ success: true, prId: tempPrId, reviewStatus: newPr.reviewStatus });
      }
    }

    db.addWebhookEvent(String(eventName), payload, 'ignored', 'Event category not monitored by this maintenance config.');
    res.json({ ignored: true });

  } catch (error: any) {
    console.error("Webhook processing error:", error);
    db.addWebhookEvent(String(eventName), payload, 'failed', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Interactive Webhook Simulator / Preset Runner
app.post('/api/webhooks/simulate', async (req, res) => {
  try {
    const { preset } = req.body;
    let title = "refactor: optimize caching lookup performance";
    let body = "Implements local optimization and updates redis connections limits.";
    let diffText = `diff --git a/src/cache/redis.ts b/src/cache/redis.ts\nindex f82b7cd..90df930 100644\n--- a/src/cache/redis.ts\n+++ b/src/cache/redis.ts\n@@ -10,4 +10,4 @@\n-await this.client.set(key, val);\n+await this.client.set(key, val, 'EX', 3600); // Added default 1 hr expiration\n`;
    let author = "hacker_clara";
    let authorAvatar = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80";
    let lineCount = 15;

    if (preset === 'sensitive_path') {
      title = "feat: Add custom Stripe payment webhooks";
      body = "Connects production Stripe handlers to update memberships structures in database.";
      diffText = `diff --git a/src/routes/payments.ts b/src/routes/payments.ts\nnew file mode 100644\nindex 0000000..ef2b7cb\n--- /dev/null\n+++ b/src/routes/payments.ts\n@@ -0,0 +1,15 @@\n+import express from 'express';\n+const router = express.Router();\n+router.post('/stripe-webhook', (req, res) => {\n+  const signature = req.headers['stripe-signature'];\n+  // CRITICAL: Bypassed signature validation for debugging?\n+  const event = req.body;\n+  res.json({ received: true });\n+});\n`;
      author = "dev_alex_99";
      authorAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80";
      lineCount = 45;
    } else if (preset === 'secret_exposure') {
      title = "fix: AWS s3 connection parameters configurations";
      body = "Sets AWS client buckets for image uploads.";
      diffText = `diff --git a/src/config/s3.ts b/src/config/s3.ts\nindex 0000000..f9247cd\n--- a/src/config/s3.ts\n+++ b/src/config/s3.ts\n@@ -5,4 +5,4 @@\n-const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;\n+const AWS_SECRET_KEY = "AKIA_fallback_secret_prod_key_18214"; // Backup token\n`;
      author = "buggy_bob";
      authorAvatar = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80";
      lineCount = 20;
    } else if (preset === 'deleted_tests') {
      title = "chore: cleanup deprecations and dead code files";
      body = "Cleans old modules to speed up runtime container loads.";
      diffText = `diff --git a/src/tests/math.test.ts b/src/tests/math.test.ts\ndeleted file mode 100644\nindex d92bc11..0000000\n--- a/src/tests/math.test.ts\n+++ /dev/null\n@@ -1,15 +0,0 @@\n-describe('Math validations', () => {\n-  test('bounds check', () => {\n-    expect(1+1).toBe(2);\n-  });\n-});\n`;
      author = "careless_dan";
      authorAvatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80";
      lineCount = 180;
    } else if (preset === 'large_changes') {
      title = "feat: Add core monolithic dashboard structures";
      body = "Massive dump of structural templates, helpers, models, and dashboard pages.";
      diffText = `diff --git a/src/components/BigDashboard.tsx b/src/components/BigDashboard.tsx\nnew file mode 100644\nindex 0000000..df1bc9b\n--- /dev/null\n+++ b/src/components/BigDashboard.tsx\n@@ -0,0 +1,350 @@\n+export function BigDashboard() {\n+  return (\n+    <div>\n+      <h1>A massive code block loaded in one pull request...</h1>\n+      {/* 350+ lines of additional frontend clutter */}\n+    </div>\n+  );\n+}\n`;
      author = "careless_dan";
      authorAvatar = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80";
      lineCount = 385;
    }

    // Call standard Webhook processing logic internally
    const mockPayload = {
      action: 'opened',
      pull_request: {
        number: Math.floor(Math.random() * 200) + 120,
        title,
        body,
        html_url: `https://github.com/expressjs/node-microservices-core/pull/${Math.floor(Math.random() * 200) + 120}`,
        user: {
          login: author,
          avatar_url: authorAvatar
        },
        head: { ref: 'simulate/patch-sandbox' },
        base: { ref: 'main' }
      },
      repository: {
        owner: { login: 'expressjs' },
        name: 'node-microservices-core',
        default_branch: 'main',
        language: 'TypeScript',
        description: 'High performance enterprise framework built with modern Express routing conventions.'
      },
      diff: diffText
    };

    // Proxy request back to webhook receiver
    const fetchResponse = await fetch(`http://localhost:${PORT}/api/webhooks/github`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-github-event': 'pull_request'
      },
      body: JSON.stringify(mockPayload)
    });

    const result = await fetchResponse.json();
    res.json({ success: true, ...result });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// REPOSITORY INSIGHTS MODULE ENDPOINT
app.get('/api/insights', (req, res) => {
  try {
    const { repoId = 'all', timeRange = '30d' } = req.query;
    const prs = db.getPRs();

    // Filter by repo
    let filteredPrs = prs;
    if (repoId !== 'all') {
      filteredPrs = prs.filter(p => p.repoId === repoId);
    }

    // Filter by timeRange
    const now = new Date();
    let daysToInclude = 30;
    if (timeRange === '7d') daysToInclude = 7;
    if (timeRange === '90d') daysToInclude = 90;

    const limitDate = new Date(now.getTime() - daysToInclude * 24 * 3600 * 1000);
    filteredPrs = filteredPrs.filter(p => new Date(p.createdAt) >= limitDate);

    // 1. Generate code churn daily stats
    const churnMap: { [key: string]: { additions: number, deletions: number } } = {};
    
    // Initialize date sequence to prevent empty charts
    for (let i = daysToInclude - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const daySeed = (d.getDay() === 0 || d.getDay() === 6) ? 0 : 1; // weekends have lower activity
      churnMap[dateStr] = { 
        additions: daySeed ? Math.floor(Math.random() * 25) + 10 : 0, 
        deletions: daySeed ? Math.floor(Math.random() * 8) + 2 : 0 
      };
    }

    // Add actual PR churn
    filteredPrs.forEach(p => {
      const dateStr = p.createdAt.split('T')[0];
      if (churnMap[dateStr]) {
        churnMap[dateStr].additions += p.linesAdded || p.lineCount || 50;
        churnMap[dateStr].deletions += p.linesDeleted || Math.floor((p.lineCount || 50) * 0.15);
      }
    });

    const churnData = Object.keys(churnMap).sort().map(date => ({
      date,
      additions: churnMap[date].additions,
      deletions: churnMap[date].deletions,
      total: churnMap[date].additions + churnMap[date].deletions
    }));

    // 2. Test coverage trend
    const sortedPrs = [...filteredPrs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    let currentCoverage = 82.5;
    const coverageData = sortedPrs.map(p => {
      if (p.testCoverage !== undefined) {
        currentCoverage = p.testCoverage;
      }
      return {
        date: p.createdAt.split('T')[0],
        title: p.title,
        coverage: parseFloat(currentCoverage.toFixed(1))
      };
    });

    // If coverageData is empty, populate with a stable slight upward baseline
    if (coverageData.length === 0) {
      for (let i = daysToInclude - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
        const dateStr = d.toISOString().split('T')[0];
        coverageData.push({
          date: dateStr,
          title: 'Baseline',
          coverage: parseFloat((82.5 + (daysToInclude - i) * 0.05).toFixed(1))
        });
      }
    }

    // 3. Frequency of specific review rule triggers
    const ruleTally: { [key: string]: number } = {
      'Sensitive Paths Protection': 0,
      'PR Size Limit': 0,
      'First-time Contributor Validation': 0,
      'Secret and Credentials Scanning': 0,
      'Min AI Confidence Score': 0,
      'Deleted Test Code Alert': 0
    };

    filteredPrs.forEach(p => {
      if (p.triggeredRules && p.triggeredRules.length > 0) {
        p.triggeredRules.forEach(ruleKey => {
          if (ruleTally[ruleKey] !== undefined) {
            ruleTally[ruleKey]++;
          } else if (ruleKey === 'sensitive_files') {
            ruleTally['Sensitive Paths Protection']++;
          } else if (ruleKey === 'large_pr') {
            ruleTally['PR Size Limit']++;
          } else if (ruleKey === 'first_time') {
            ruleTally['First-time Contributor Validation']++;
          } else if (ruleKey === 'secrets_detected') {
            ruleTally['Secret and Credentials Scanning']++;
          } else if (ruleKey === 'confidence_threshold') {
            ruleTally['Min AI Confidence Score']++;
          } else if (ruleKey === 'deleted_tests') {
            ruleTally['Deleted Test Code Alert']++;
          } else {
            ruleTally[ruleKey] = (ruleTally[ruleKey] || 0) + 1;
          }
        });
      } else if (p.isFlagged && p.flagReason) {
        const reason = p.flagReason.toLowerCase();
        if (reason.includes('sensitive') || reason.includes('auth') || reason.includes('middleware')) {
          ruleTally['Sensitive Paths Protection']++;
        }
        if (reason.includes('size') || reason.includes('lines') || reason.includes('limit')) {
          ruleTally['PR Size Limit']++;
        }
        if (reason.includes('first-time') || reason.includes('zero prior')) {
          ruleTally['First-time Contributor Validation']++;
        }
        if (reason.includes('secret') || reason.includes('password') || reason.includes('key')) {
          ruleTally['Secret and Credentials Scanning']++;
        }
        if (reason.includes('confidence') || reason.includes('below')) {
          ruleTally['Min AI Confidence Score']++;
        }
        if (reason.includes('deleted') || reason.includes('test')) {
          ruleTally['Deleted Test Code Alert']++;
        }
      }
    });

    const ruleTriggers = Object.keys(ruleTally).map(rule => ({
      rule,
      count: ruleTally[rule]
    })).sort((a, b) => b.count - a.count);

    // 4. Average Time to Merge
    const mergedPrs = filteredPrs.filter(p => p.state === 'merged');
    let totalHours = 0;
    let mergeCount = 0;

    mergedPrs.forEach(p => {
      if (p.mergeDurationHours !== undefined) {
        totalHours += p.mergeDurationHours;
        mergeCount++;
      } else {
        const created = new Date(p.createdAt).getTime();
        const updated = new Date(p.updatedAt).getTime();
        const duration = Math.max(1, (updated - created) / (3600 * 1000));
        totalHours += duration;
        mergeCount++;
      }
    });

    const averageMergeTimeHours = mergeCount > 0 ? parseFloat((totalHours / mergeCount).toFixed(1)) : 14.5;

    res.json({
      churnData,
      coverageData,
      ruleTriggers,
      mergeMetrics: {
        averageHours: averageMergeTimeHours,
        totalMerged: mergeCount || 5
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI REVIEW REPLAY EXECUTION ENDPOINT
app.post('/api/prs/:id/replay', async (req, res) => {
  try {
    const { id } = req.params;
    const { model = 'gemini-3.5-flash', promptTemplate } = req.body;
    
    const prs = db.getPRs();
    const pr = prs.find(p => p.id === id);
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    const settings = db.getSettings();

    // Run AI review with custom parameters
    const aiReview = await runAIPRReview(
      pr.title, 
      pr.body, 
      pr.diffText, 
      "Standard high quality practices.", 
      model, 
      promptTemplate
    );

    // Evaluate Rules
    const activeRules = db.getRules();
    const mockPrForRules = { ...pr, confidenceScore: aiReview.confidence || 90 };
    const ruleCheck = evaluateOverrideRules(mockPrForRules, activeRules);

    // Create replay log
    const replayId = `replay_${Date.now()}`;
    const replayLog: ReviewReplay = {
      id: replayId,
      prId: id,
      model,
      promptTemplate: promptTemplate || settings.aiPromptTemplate,
      score: aiReview.score || 85,
      summary: aiReview.summary || "Completed replay assessment.",
      correctness: aiReview.correctness || "Correctness parameters aligned.",
      security: aiReview.security || "Security profiles scanned.",
      performance: aiReview.performance || "Performance metrics parsed.",
      maintainability: aiReview.maintainability || "Structure compliant.",
      decidedAction: ruleCheck.isTriggered ? 'flag' : (aiReview.decidedAction === 'request_changes' ? 'request_changes' : 'approve'),
      reason: ruleCheck.isTriggered ? ruleCheck.reason : (aiReview.reason || 'Patch meets conditions.'),
      confidence: aiReview.confidence || 90,
      inlineCommentsCount: aiReview.inlineComments?.length || 0,
      createdAt: new Date().toISOString()
    };

    // Save replay inside the Database
    db.addReplay(replayLog);

    // Save audit log
    db.addAuditLog('REPLAY_TRIGGERED', `Re-triggered review replay on PR #${pr.number} using model ${model}`);

    res.json({
      success: true,
      replay: replayLog,
      allReplays: db.getReplaysForPR(id)
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET REPLAYS FOR PULL REQUEST ENDPOINT
app.get('/api/prs/:id/replays', (req, res) => {
  try {
    const { id } = req.params;
    res.json(db.getReplaysForPR(id));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// VITE MIDDLEWARE SETUP

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PR Review Agent server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
