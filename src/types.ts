export const categories = [
  "Coding Agents",
  "Developer Tools",
  "Design & Media",
  "Creator & Content",
  "Data & Research",
  "Productivity",
  "MCP & Tooling",
  "Prompt & Workflow",
  "Learning & Docs",
] as const;

export type Category = (typeof categories)[number];
export type Locale = "zh" | "en";
export type SortKey = "stars" | "forks" | "updated" | "name";
export type AudienceKey =
  | "developer"
  | "creator"
  | "designMarketing"
  | "research"
  | "productivity"
  | "mcp";
export type SpotlightKey =
  | "weeklyHot"
  | "classicStars"
  | "recentlyActive"
  | "beginnerFriendly"
  | "creatorPicks"
  | "developerStack"
  | "growth7d"
  | "growth30d"
  | "rankRisers";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type SkillStatus = "active" | "experimental" | "archived";
export type Freshness = "fresh" | "active" | "quiet" | "stale" | "unknown";
export type TrendStatus = "ready" | "collecting";

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface QualitySignals {
  hasLicense: boolean;
  hasHomepage: boolean;
  recentlyPushed: boolean;
  archived: boolean;
  issueLoad: "low" | "medium" | "high" | "unknown";
}

export interface SkillRepoInput {
  repo: string;
  category: Category;
  platforms: string[];
  tags: string[];
  summary: LocalizedText;
  homepage?: string;
  featured?: boolean;
  audiences?: AudienceKey[];
  useCases?: LocalizedText[];
  difficulty?: Difficulty;
  status?: SkillStatus;
}

export interface SkillRepoSnapshot extends SkillRepoInput {
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  language: string;
  license: string;
  htmlUrl: string;
  pushedAt: string;
  updatedAt: string;
  archived: boolean;
  disabled: boolean;
  fetchStatus: "ok" | "error";
  errorMessage?: string;
  lastFetchedAt: string;
  rank?: number;
  rankByCategory?: number;
  freshness?: Freshness;
  qualitySignals?: QualitySignals;
  growth7d?: number | null;
  growth30d?: number | null;
  rankDelta7d?: number | null;
  rankDelta30d?: number | null;
  trendStatus?: TrendStatus;
}

export interface CandidateRepo {
  repo: string;
  fullName: string;
  category: Category;
  matchedQuery: string;
  reason: LocalizedText;
  description: string;
  stars: number;
  forks: number;
  language: string;
  license: string;
  htmlUrl: string;
  pushedAt: string;
  updatedAt: string;
  alreadyCurated: boolean;
  fetchStatus?: "ok" | "error";
  lastFetchedAt: string;
  suggestedCategory?: Category;
  suggestedAudiences?: AudienceKey[];
  confidence?: number;
}

export interface SnapshotPayload {
  generatedAt: string;
  source: string;
  repositories: SkillRepoSnapshot[];
}

export interface CandidatesPayload {
  generatedAt: string;
  source: string;
  candidates: CandidateRepo[];
}

export interface TrendSample {
  date: string;
  stars: number;
  forks: number;
  rank: number;
  rankByCategory: number;
}

export interface RepoHistory {
  repo: string;
  samples: TrendSample[];
}

export interface HistoryPayload {
  generatedAt: string;
  retentionDays: number;
  repositories: RepoHistory[];
}
