export interface Repository {
  id: string;
  owner: string;
  name: string;
  defaultBranch: string;
  language: string;
  description: string;
  createdAt: string;
  isMock?: boolean;
}

export type PRState = 'open' | 'closed' | 'merged';
export type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'flagged';

export interface PullRequest {
  id: string;
  repoId: string;
  number: number;
  title: string;
  state: PRState;
  body: string;
  headRef: string;
  baseRef: string;
  author: string;
  authorAvatar: string;
  prUrl: string;
  commentsCount: number;
  pointsAwarded: number;
  confidenceScore: number;
  autoMerge: boolean;
  forceApproved: boolean;
  isFlagged: boolean;
  reviewStatus: ReviewStatus;
  flagReason: string;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
  diffText: string;
  linesAdded?: number;
  linesDeleted?: number;
  testCoverage?: number;
  triggeredRules?: string[];
  mergeDurationHours?: number;
}

export interface ReviewReplay {
  id: string;
  prId: string;
  model: string;
  promptTemplate: string;
  score: number;
  summary: string;
  correctness: string;
  security: string;
  performance: string;
  maintainability: string;
  decidedAction: 'approve' | 'request_changes' | 'flag';
  reason: string;
  confidence: number;
  inlineCommentsCount: number;
  createdAt: string;
}

export type RuleType = 'boolean' | 'number' | 'string';

export interface OverrideRule {
  id: string;
  key: string;
  label: string;
  description: string;
  type: RuleType;
  value: string | number | boolean;
  isEnabled: boolean;
  category: 'security' | 'size' | 'files' | 'contributor' | 'ci';
}

export interface InlineComment {
  file: string;
  line: number;
  comment: string;
  suggestion?: string;
  type: 'issue' | 'info' | 'warning';
}

export interface Review {
  id: string;
  prId: string;
  score: number; // 0-100
  summary: string;
  correctness: string;
  security: string;
  performance: string;
  maintainability: string;
  inlineComments: InlineComment[];
  decidedAction: 'approve' | 'request_changes' | 'flag';
  reason: string;
  confidence: number; // 0-100
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  prId: string;
  sender: 'agent' | 'contributor' | 'admin';
  senderName: string;
  senderAvatar: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface ContributorPoint {
  id: string;
  username: string;
  avatar: string;
  points: number;
  streak: number;
  prsMerged: number;
  reviewsCompleted: number;
  achievements: string[];
  lastContributionDate?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface WebhookEvent {
  id: string;
  eventName: string;
  payload: string; // stringified JSON
  status: 'success' | 'failed' | 'ignored';
  response: string;
  timestamp: string;
}

export interface SystemSettings {
  aiModel: string;
  aiPromptTemplate: string;
  reviewStrictness: 'lenient' | 'standard' | 'strict';
  webhookSecret: string;
  autoMergeDefault: boolean;
  isMaintenanceMode: boolean;
  pointsOnMerge: number;
}
