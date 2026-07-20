import fs from 'fs';
import path from 'path';
import { 
  Repository, 
  PullRequest, 
  OverrideRule, 
  Review, 
  ChatMessage, 
  ContributorPoint, 
  AuditLog, 
  WebhookEvent, 
  SystemSettings,
  ReviewReplay
} from '../types.js';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface Schema {
  repositories: Repository[];
  pullRequests: PullRequest[];
  rules: OverrideRule[];
  reviews: Review[];
  chatMessages: ChatMessage[];
  contributorPoints: ContributorPoint[];
  auditLogs: AuditLog[];
  webhookEvents: WebhookEvent[];
  settings: SystemSettings;
  replays: ReviewReplay[];
}

const DEFAULT_RULES: OverrideRule[] = [
  {
    id: 'rule_sensitive_files',
    key: 'sensitive_files',
    label: 'Sensitive Paths Protection',
    description: 'Flag PRs that modify auth, payment, database schemas, or CI/CD configuration files.',
    type: 'boolean',
    value: true,
    isEnabled: true,
    category: 'security'
  },
  {
    id: 'rule_large_pr',
    key: 'large_pr',
    label: 'PR Size Limit',
    description: 'Flag PRs that change more than a specific number of lines of code.',
    type: 'number',
    value: 200,
    isEnabled: true,
    category: 'size'
  },
  {
    id: 'rule_first_time',
    key: 'first_time',
    label: 'First-time Contributor Validation',
    description: 'Always flag or request manual verification for authors with zero prior merged PRs.',
    type: 'boolean',
    value: true,
    isEnabled: true,
    category: 'contributor'
  },
  {
    id: 'rule_secrets_detected',
    key: 'secrets_detected',
    label: 'Secret and Credentials Scanning',
    description: 'Scan diffs for password formulas, env declarations, secret tokens, or private keys.',
    type: 'boolean',
    value: true,
    isEnabled: true,
    category: 'security'
  },
  {
    id: 'rule_confidence_threshold',
    key: 'confidence_threshold',
    label: 'Min AI Confidence Score',
    description: 'Flag PR reviews where the AI rating falls below this percentage threshold.',
    type: 'number',
    value: 80,
    isEnabled: true,
    category: 'security'
  },
  {
    id: 'rule_deleted_tests',
    key: 'deleted_tests',
    label: 'Deleted Test Code Alert',
    description: 'Flag and block auto-merge if test files (.test.ts, spec.js, etc.) are removed or scaled down.',
    type: 'boolean',
    value: true,
    isEnabled: true,
    category: 'ci'
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  aiModel: 'gemini-3.5-flash',
  aiPromptTemplate: `You are the autonomous PR Review Agent. Analyze the PR details, files changed, and code diff below.
Evaluate based on: Correctness, Security, Performance, Maintainability, and Test Coverage.

Generate inline comments if issues are found, referencing files and lines.
Provide a final verdict: approve, request_changes, or flag (for critical/security escalations).
Specify a confidence score (0-100) and clear reasoning.`,
  reviewStrictness: 'standard',
  webhookSecret: 'pr_agent_secret_secure_1337',
  autoMergeDefault: true,
  isMaintenanceMode: false,
  pointsOnMerge: 15
};

const SEED_REPOS: Repository[] = [
  {
    id: 'repo_fastapi_node',
    owner: 'expressjs',
    name: 'node-microservices-core',
    defaultBranch: 'main',
    language: 'TypeScript',
    description: 'High performance enterprise framework built with modern Express routing conventions.',
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'repo_vector_db',
    owner: 'gemini-org',
    name: 'vector-index-agent',
    defaultBranch: 'main',
    language: 'TypeScript',
    description: 'Autonomous context-retrieval pipeline indexing system documentation with vector search capabilities.',
    createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
  }
];

const SEED_PR_LIST: PullRequest[] = [
  {
    id: 'pr_101',
    repoId: 'repo_fastapi_node',
    number: 101,
    title: 'feat: Add JWT token validation middleware',
    state: 'open',
    body: 'Implements full JSON Web Token parsing, validation, and request decorating middleware for private paths.',
    headRef: 'feat/jwt-middleware',
    baseRef: 'main',
    author: 'dev_alex_99',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    prUrl: 'https://github.com/expressjs/node-microservices-core/pull/101',
    commentsCount: 3,
    pointsAwarded: 0,
    confidenceScore: 92,
    autoMerge: true,
    forceApproved: false,
    isFlagged: true,
    reviewStatus: 'flagged',
    flagReason: 'Touches sensitive path: middleware/auth.ts (Security Rule Triggered)',
    lineCount: 145,
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    diffText: `diff --git a/src/middleware/auth.ts b/src/middleware/auth.ts
new file mode 100644
index 0000000..9df2bc3
--- /dev/null
+++ b/src/middleware/auth.ts
@@ -0,0 +1,24 @@
+import { Request, Response, NextFunction } from 'express';
+import jwt from 'jsonwebtoken';
+
+export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
+  const authHeader = req.headers['authorization'];
+  const token = authHeader && authHeader.split(' ')[1];
+
+  if (!token) {
+    return res.status(401).json({ error: 'Access token required' });
+  }
+
+  // CRITICAL: Hardcoded backup secret key for auth fallback?
+  const SECRET = process.env.JWT_SECRET || 'fallback_secret_not_safe';
+
+  jwt.verify(token, SECRET, (err: any, user: any) => {
+    if (err) {
+      return res.status(403).json({ error: 'Invalid or expired token' });
+    }
+    req.user = user;
+    next();
+  });
+};
+`
  },
  {
    id: 'pr_102',
    repoId: 'repo_vector_db',
    number: 48,
    title: 'fix: Vector similarity sorting algorithm precision',
    state: 'merged',
    body: 'Corrects dot-product normalization formula that caused off-by-one ordering inside large context caches.',
    headRef: 'fix/similarity-sort',
    baseRef: 'main',
    author: 'hacker_clara',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    prUrl: 'https://github.com/gemini-org/vector-index-agent/pull/48',
    commentsCount: 2,
    pointsAwarded: 15,
    confidenceScore: 98,
    autoMerge: true,
    forceApproved: true,
    isFlagged: false,
    reviewStatus: 'approved',
    flagReason: '',
    lineCount: 35,
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    diffText: `diff --git a/src/math/similarity.ts b/src/math/similarity.ts
index e234ef1..d12b399 100644
--- a/src/math/similarity.ts
+++ b/src/math/similarity.ts
@@ -10,6 +10,6 @@ export function cosineSimilarity(vecA: number[], vecB: number[]): number {
   let sumA = 0;
   let sumB = 0;
   for (let i = 0; i < vecA.length; i++) {
-    dotProduct += vecA[i] * vecB[i];
+    dotProduct += vecA[i] * vecB[i];
     sumA += vecA[i] * vecA[i];
     sumB += vecB[i] * vecB[i];
   }
-  return dotProduct / (Math.sqrt(sumA) * Math.sqrt(sumB));
+  const denominator = Math.sqrt(sumA) * Math.sqrt(sumB);
+  return denominator === 0 ? 0 : dotProduct / denominator;
 }
`
  },
  {
    id: 'pr_103',
    repoId: 'repo_fastapi_node',
    number: 102,
    title: 'perf: caching layer replacement and Redis connection pool',
    state: 'open',
    body: 'Replaces standard in-memory array cache with high performance clusters and configurable thread pools.',
    headRef: 'perf/redis-upgrade',
    baseRef: 'main',
    author: 'speedy_sam',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    prUrl: 'https://github.com/expressjs/node-microservices-core/pull/102',
    commentsCount: 1,
    pointsAwarded: 0,
    confidenceScore: 72,
    autoMerge: false,
    forceApproved: false,
    isFlagged: false,
    reviewStatus: 'changes_requested',
    flagReason: '',
    lineCount: 412,
    createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString(),
    diffText: `diff --git a/src/cache/redis.ts b/src/cache/redis.ts
new file mode 100644
index 0000000..f82b7cd
--- /dev/null
+++ b/src/cache/redis.ts
@@ -0,0 +1,18 @@
+import Redis from 'ioredis';
+
+// Unhandled promise rejection risk below, and missing process.env safety limits
+export class CacheEngine {
+  private client: Redis;
+  
+  constructor() {
+    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
+  }
+
+  async get(key: string) {
+    return await this.client.get(key);
+  }
+
+  async set(key: string, val: string) {
+    // No expiration parameter has been specified!
+    await this.client.set(key, val);
+  }
+}
+`
  }
];

const SEED_REVIEWS: Review[] = [
  {
    id: 'rev_101',
    prId: 'pr_101',
    score: 85,
    summary: 'The JWT authentication middleware is mostly solid, but we flagged it because it updates a highly sensitive path (`src/middleware/auth.ts`) and includes a potentially risky hardcoded fallback secret key which violates our strict security standard.',
    correctness: 'The routing middleware integrates well with Express standard arguments and correctly intercepts headers. Token split operation operates as expected.',
    security: 'CRITICAL WARNING: The backup hardcoded string value `"fallback_secret_not_safe"` is set as a fallback when the `JWT_SECRET` environment variable is not defined. In a staging or production build without environment vars, this exposes the system to signature forging. Remove fallback secrets immediately.',
    performance: 'Extremely lightweight token validation process. Minimal memory allocation overhead.',
    maintainability: 'Well documented parameters and clean typing declarations.',
    inlineComments: [
      {
        file: 'src/middleware/auth.ts',
        line: 12,
        comment: 'CRITICAL SECURITY BREACH: Never use a hardcoded secret key fallback in authentication modules. If `process.env.JWT_SECRET` is missing, the application should throw a fatal error on startup.',
        suggestion: "if (!process.env.JWT_SECRET) {\n  throw new Error('JWT_SECRET env variable must be declared');\n}\nconst SECRET = process.env.JWT_SECRET;",
        type: 'issue'
      },
      {
        file: 'src/middleware/auth.ts',
        line: 5,
        comment: 'Recommendation: Restrict this middleware to only process Bearer tokens rather than arbitrary splits.',
        type: 'info'
      }
    ],
    decidedAction: 'flag',
    reason: 'Touches protected sensitive auth files & contains fallback secrets.',
    confidence: 95,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'rev_102',
    prId: 'pr_102',
    score: 99,
    summary: 'Outstanding bugfix. The vector calculation correctly accounts for potential divide-by-zero scenarios and prevents sorting indexing from sliding into negative coordinates.',
    correctness: 'The denominator-handling code is clean, well-bounded, and verified by mathematical tests.',
    security: 'No security credentials or risk exposures identified in this module.',
    performance: 'Optimized check runs. Safely checks values in memory without re-initializing coefficients.',
    maintainability: 'Maintains code clarity and complies perfectly with vector index standards.',
    inlineComments: [],
    decidedAction: 'approve',
    reason: 'PR addresses bug precisely and includes essential bounds checking. Passed all override thresholds.',
    confidence: 99,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'rev_103',
    prId: 'pr_103',
    score: 68,
    summary: 'Review requested major structural modifications before merging this caching layer.',
    correctness: 'Connection pool initialization is prone to unhandled errors if Redis is currently offline.',
    security: 'Requires credential verification limits.',
    performance: 'Unbounded cache sets are prone to memory leaks. Every caching mechanism must declare an explicit default TTL (Time-To-Live).',
    maintainability: 'Lacks documentation on setup and required environment variables.',
    inlineComments: [
      {
        file: 'src/cache/redis.ts',
        line: 15,
        comment: 'Performance Issue: Setting persistent keys without a TTL or maximum eviction configuration can slowly deplete Redis node memory.',
        suggestion: "await this.client.set(key, val, 'EX', 3600); // Set default 1 hour expiration",
        type: 'warning'
      }
    ],
    decidedAction: 'request_changes',
    reason: 'Missing default TTL values and connection recovery blocks.',
    confidence: 88,
    createdAt: new Date(Date.now() - 9 * 3600 * 1000).toISOString()
  }
];

const SEED_CHAT: ChatMessage[] = [
  {
    id: 'msg_1',
    prId: 'pr_101',
    sender: 'agent',
    senderName: 'PR Review Agent',
    senderAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
    message: '👋 Hello Alex! I have completed analyzing your PR changes. I found **1 critical issue** and **1 general suggestion** regarding your JWT authentication module. Because this touches sensitive paths, this PR has been flagged for human maintainer approval.',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    isSystem: true
  },
  {
    id: 'msg_2',
    prId: 'pr_101',
    sender: 'contributor',
    senderName: 'dev_alex_99',
    senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    message: 'Thanks for the quick review! Ah, I see the hardcoded fallback. I added that just for my local development setup since I had not provisioned the environment variables. Let me fix it immediately.',
    timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
  },
  {
    id: 'msg_3',
    prId: 'pr_101',
    sender: 'admin',
    senderName: 'Maintainer (You)',
    senderAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
    message: 'Hey Alex, good catch by the agent. Please update the middleware to throw an explicit configuration error if JWT_SECRET is undefined, then re-push. We will approve and let the agent auto-merge it once checks pass!',
    timestamp: new Date(Date.now() - 15 * 3600 * 1000).toISOString()
  }
];

const SEED_POINTS: ContributorPoint[] = [
  {
    id: 'pt_clara',
    username: 'hacker_clara',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    points: 125,
    streak: 4,
    prsMerged: 8,
    reviewsCompleted: 12,
    achievements: ['Fast Merger', 'Bug Squasher', 'Streak Master'],
    lastContributionDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'pt_alex',
    username: 'dev_alex_99',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    points: 45,
    streak: 1,
    prsMerged: 3,
    reviewsCompleted: 4,
    achievements: ['First Contribution', 'Clean Coder'],
    lastContributionDate: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'pt_sam',
    username: 'speedy_sam',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    points: 90,
    streak: 2,
    prsMerged: 6,
    reviewsCompleted: 7,
    achievements: ['Speed Runner', 'Pragmatist'],
    lastContributionDate: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
  }
];

const SEED_AUDITS: AuditLog[] = [
  {
    id: 'aud_1',
    action: 'Repository Registered',
    details: 'Connected node-microservices-core to PR Review Agent.',
    timestamp: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'aud_2',
    action: 'PR Auto-Merged',
    details: 'Successfully auto-merged Pull Request #48 for vector-index-agent.',
    timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  }
];

class JsonDatabase {
  private cache: Schema | null = null;

  private initializeDb() {
    if (!fs.existsSync(DB_FILE)) {
      const initialSchema: Schema = {
        repositories: SEED_REPOS,
        pullRequests: SEED_PR_LIST,
        rules: DEFAULT_RULES,
        reviews: SEED_REVIEWS,
        chatMessages: SEED_CHAT,
        contributorPoints: SEED_POINTS,
        auditLogs: SEED_AUDITS,
        webhookEvents: [],
        settings: DEFAULT_SETTINGS,
        replays: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf8');
      this.cache = initialSchema;
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.cache = JSON.parse(raw);
      } catch (e) {
        console.error("Error reading db file, regenerating seeds", e);
        const initialSchema: Schema = {
          repositories: SEED_REPOS,
          pullRequests: SEED_PR_LIST,
          rules: DEFAULT_RULES,
          reviews: SEED_REVIEWS,
          chatMessages: SEED_CHAT,
          contributorPoints: SEED_POINTS,
          auditLogs: SEED_AUDITS,
          webhookEvents: [],
          settings: DEFAULT_SETTINGS,
          replays: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf8');
        this.cache = initialSchema;
      }
    }
  }

  private getData(): Schema {
    if (!this.cache) {
      this.initializeDb();
    }
    if (!this.cache!.replays) {
      this.cache!.replays = [];
    }
    return this.cache!;
  }

  private saveData(data: Schema) {
    this.cache = data;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error("Failed to write to file database", err);
    }
  }

  // REPOSITORIES
  getRepos(): Repository[] {
    return this.getData().repositories;
  }

  addRepo(repo: Repository): Repository {
    const data = this.getData();
    data.repositories.push(repo);
    this.saveData(data);
    return repo;
  }

  deleteRepo(id: string): boolean {
    const data = this.getData();
    const len = data.repositories.length;
    data.repositories = data.repositories.filter(r => r.id !== id);
    if (data.repositories.length !== len) {
      this.saveData(data);
      return true;
    }
    return false;
  }

  // PULL REQUESTS
  getPRs(): PullRequest[] {
    return this.getData().pullRequests;
  }

  getPR(id: string): PullRequest | undefined {
    return this.getData().pullRequests.find(pr => pr.id === id);
  }

  addPR(pr: PullRequest): PullRequest {
    const data = this.getData();
    data.pullRequests.unshift(pr);
    this.saveData(data);
    return pr;
  }

  updatePR(id: string, updates: Partial<PullRequest>): PullRequest | undefined {
    const data = this.getData();
    const prIdx = data.pullRequests.findIndex(pr => pr.id === id);
    if (prIdx !== -1) {
      data.pullRequests[prIdx] = { ...data.pullRequests[prIdx], ...updates, updatedAt: new Date().toISOString() };
      this.saveData(data);
      return data.pullRequests[prIdx];
    }
    return undefined;
  }

  // RULES
  getRules(): OverrideRule[] {
    return this.getData().rules;
  }

  updateRule(id: string, value: string | number | boolean, isEnabled: boolean): OverrideRule | undefined {
    const data = this.getData();
    const ruleIdx = data.rules.findIndex(r => r.id === id);
    if (ruleIdx !== -1) {
      data.rules[ruleIdx].value = value;
      data.rules[ruleIdx].isEnabled = isEnabled;
      this.saveData(data);
      return data.rules[ruleIdx];
    }
    return undefined;
  }

  // REVIEWS
  getReviews(): Review[] {
    return this.getData().reviews;
  }

  getReviewForPR(prId: string): Review | undefined {
    return this.getData().reviews.find(r => r.prId === prId);
  }

  addReview(review: Review): Review {
    const data = this.getData();
    // Remove existing review if there is one
    data.reviews = data.reviews.filter(r => r.prId !== review.prId);
    data.reviews.push(review);
    this.saveData(data);
    return review;
  }

  // REPLAYS
  getReplaysForPR(prId: string): ReviewReplay[] {
    const data = this.getData();
    return data.replays.filter(r => r.prId === prId);
  }

  addReplay(replay: ReviewReplay): ReviewReplay {
    const data = this.getData();
    data.replays.push(replay);
    this.saveData(data);
    return replay;
  }

  // CHAT MESSAGES
  getChatMessages(prId: string): ChatMessage[] {
    return this.getData().chatMessages.filter(msg => msg.prId === prId);
  }

  addChatMessage(msg: ChatMessage): ChatMessage {
    const data = this.getData();
    data.chatMessages.push(msg);
    this.saveData(data);
    return msg;
  }

  // CONTRIBUTOR POINTS
  getPoints(): ContributorPoint[] {
    return this.getData().contributorPoints;
  }

  updatePoints(username: string, change: number, isNewMerge: boolean = false): ContributorPoint {
    const data = this.getData();
    let point = data.contributorPoints.find(p => p.username === username);
    if (!point) {
      point = {
        id: `pt_${username}_${Date.now()}`,
        username,
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`,
        points: 0,
        streak: 1,
        prsMerged: 0,
        reviewsCompleted: 0,
        achievements: ['First Contribution']
      };
      data.contributorPoints.push(point);
    }

    point.points += change;
    if (isNewMerge) {
      point.prsMerged += 1;
      // Handle streak progression
      const lastDateStr = point.lastContributionDate;
      const today = new Date().toISOString().split('T')[0];
      if (lastDateStr) {
        const lastDate = lastDateStr.split('T')[0];
        if (lastDate === today) {
          // Already contributed today, maintain streak
        } else {
          const diffTime = Math.abs(new Date(today).getTime() - new Date(lastDate).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            point.streak += 1;
          } else if (diffDays > 1) {
            point.streak = 1; // reset
          }
        }
      } else {
        point.streak = 1;
      }
      point.lastContributionDate = new Date().toISOString();

      // Achievements triggers
      if (point.prsMerged >= 5 && !point.achievements.includes('Streak Master')) {
        point.achievements.push('Streak Master');
      }
      if (point.points >= 100 && !point.achievements.includes('Elite Contributor')) {
        point.achievements.push('Elite Contributor');
      }
    } else {
      point.reviewsCompleted += 1;
    }

    this.saveData(data);
    return point;
  }

  // AUDIT LOGS
  getAuditLogs(): AuditLog[] {
    return this.getData().auditLogs;
  }

  addAuditLog(action: string, details: string): AuditLog {
    const data = this.getData();
    const log: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    data.auditLogs.unshift(log);
    if (data.auditLogs.length > 200) {
      data.auditLogs = data.auditLogs.slice(0, 200);
    }
    this.saveData(data);
    return log;
  }

  // WEBHOOK EVENTS
  getWebhookEvents(): WebhookEvent[] {
    return this.getData().webhookEvents;
  }

  addWebhookEvent(eventName: string, payload: any, status: 'success' | 'failed' | 'ignored', response: string): WebhookEvent {
    const data = this.getData();
    const event: WebhookEvent = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      eventName,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      status,
      response,
      timestamp: new Date().toISOString()
    };
    data.webhookEvents.unshift(event);
    if (data.webhookEvents.length > 50) {
      data.webhookEvents = data.webhookEvents.slice(0, 50);
    }
    this.saveData(data);
    return event;
  }

  // SETTINGS
  getSettings(): SystemSettings {
    return this.getData().settings;
  }

  updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    const data = this.getData();
    data.settings = { ...data.settings, ...updates };
    this.saveData(data);
    return data.settings;
  }
}

export const db = new JsonDatabase();
