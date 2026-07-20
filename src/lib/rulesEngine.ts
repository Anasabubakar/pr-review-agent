import { PullRequest, OverrideRule } from '../types.js';
import { db } from '../db/jsonDb.js';

export interface RuleEvaluationResult {
  isTriggered: boolean;
  reason: string;
  triggeredRules: string[];
}

export function evaluateOverrideRules(pr: PullRequest, rules: OverrideRule[]): RuleEvaluationResult {
  const triggeredRules: string[] = [];
  const reasons: string[] = [];

  for (const rule of rules) {
    if (!rule.isEnabled) continue;

    switch (rule.key) {
      case 'sensitive_files': {
        const sensitiveKeywords = ['auth', 'payment', 'stripe', 'secret', 'password', 'database', 'migration', 'deploy', '.env', 'dockerfile', 'jenkins', 'github/workflows', 'config'];
        const isSensitive = sensitiveKeywords.some(keyword => {
          // Check if diff title, body, or diff text mentions sensitive structures
          const prContent = (pr.title + ' ' + pr.body + ' ' + pr.diffText).toLowerCase();
          return prContent.includes(keyword);
        });
        
        if (isSensitive) {
          triggeredRules.push(rule.label);
          reasons.push(`Touches protected paths, configurations, or credentials.`);
        }
        break;
      }

      case 'large_pr': {
        const lineThreshold = typeof rule.value === 'number' ? rule.value : parseInt(rule.value as string, 10) || 200;
        if (pr.lineCount > lineThreshold) {
          triggeredRules.push(rule.label);
          reasons.push(`PR size (${pr.lineCount} lines) exceeds threshold limit (${lineThreshold} lines).`);
        }
        break;
      }

      case 'first_time': {
        const allPRs = db.getPRs();
        const mergedPRsByAuthor = allPRs.filter(p => p.author === pr.author && p.state === 'merged');
        
        if (mergedPRsByAuthor.length === 0) {
          triggeredRules.push(rule.label);
          reasons.push(`Author '${pr.author}' is a first-time contributor (0 prior merged PRs).`);
        }
        break;
      }

      case 'secrets_detected': {
        // Simple regex or keyword checks for secret patterns in additions (lines starting with +)
        const secretRegexes = [
          /const\s+\w*(secret|key|token|password|auth)\s*=\s*['"`][a-zA-Z0-9_\-]{8,}['"`]/i,
          /JWT_SECRET\s*=\s*['"`]/i,
          /api_key\s*=\s*['"`]/i,
          /AWS_ACCESS_KEY_ID/i,
          /fallback_secret/i
        ];

        const additions = pr.diffText.split('\n').filter(line => line.startsWith('+'));
        const hasSecret = additions.some(line => secretRegexes.some(rx => rx.test(line)));

        if (hasSecret) {
          triggeredRules.push(rule.label);
          reasons.push(`Potential plaintext credentials, fallback secrets, or key assignments detected in diff.`);
        }
        break;
      }

      case 'confidence_threshold': {
        const minConfidence = typeof rule.value === 'number' ? rule.value : parseInt(rule.value as string, 10) || 80;
        if (pr.confidenceScore < minConfidence) {
          triggeredRules.push(rule.label);
          reasons.push(`AI Review confidence score (${pr.confidenceScore}%) falls below safety threshold (${minConfidence}%).`);
        }
        break;
      }

      case 'deleted_tests': {
        // Look for removed lines in files ending with test or spec
        const diffLines = pr.diffText.split('\n');
        let inTestFile = false;
        let deletedLinesCount = 0;

        for (const line of diffLines) {
          if (line.startsWith('diff --git')) {
            inTestFile = line.toLowerCase().includes('test') || line.toLowerCase().includes('spec');
          }
          if (inTestFile && line.startsWith('-') && !line.startsWith('---')) {
            deletedLinesCount++;
          }
        }

        if (deletedLinesCount > 2) { // Allow tiny whitespace removals, flag significant ones
          triggeredRules.push(rule.label);
          reasons.push(`Significant reduction or deletion of test suites detected (${deletedLinesCount} test lines removed).`);
        }
        break;
      }
    }
  }

  return {
    isTriggered: triggeredRules.length > 0,
    reason: reasons.join(' | '),
    triggeredRules
  };
}
