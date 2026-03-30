export interface RepoStats {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  contributors: number;
  languages: Record<string, number>;
  recentCommits: number;
  totalCommits: number;
  ageInDays: number;
  isArchived: boolean;
  isEmpty: boolean;
  defaultBranch: string;
  license: string | null;
  topics: string[];
  createdAt: string;
  pushedAt: string | null;
}

export interface Scores {
  activityScore: number;
  complexityScore: number;
  learningDifficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface ScoreBreakdown {
  activity: {
    starComponent: number;
    forkComponent: number;
    commitComponent: number;
    issueComponent: number;
    contributorComponent: number;
    archivedPenalty: number;
    total: number;
  };
  complexity: {
    languageComponent: number;
    contributorComponent: number;
    commitComponent: number;
    ageComponent: number;
    total: number;
  };
}

export interface RepoReport {
  input: string;
  status: "success" | "error" | "warning";
  stats?: RepoStats;
  scores?: Scores;
  breakdown?: ScoreBreakdown;
  warnings: string[];
  error?: string;
  analyzedAt: string;
  cached: boolean;
}

export interface AnalyzeRequest {
  urls: string[];
}

export interface AnalyzeResponse {
  reports: RepoReport[];
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: string;
  };
  analyzedAt: string;
}
