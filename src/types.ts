export type Locale = "zh" | "en";
export type SortKey =
  | "stars"
  | "forks"
  | "updated"
  | "name"
  | "popularity"
  | "activity"
  | "adoption"
  | "ecosystem"
  | "composite";
export type AudienceKey =
  | "media"
  | "developer"
  | "writing"
  | "design"
  | "data"
  | "productivity"
  | "beginner";
export type SpotlightKey =
  | "topStars"
  | "featured"
  | "chineseFriendly"
  | "recentlyUpdated"
  | "growth7d"
  | "growth30d"
  | "rankRisers";
export type TrendStatus = "ready" | "collecting";
export type FetchStatus = "ok" | "fallback" | "error";

export type EcosystemKey =
  | "claude"
  | "codex"
  | "copilot"
  | "universal"
  | "huggingface"
  | "mcp";

export interface EcosystemMetric {
  ecosystem: EcosystemKey;
  compatible: boolean;
  verified: boolean;
  badge?: string;
}

export interface HnMetric {
  mentions30d: number;
  points: number;
  comments: number;
}

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface SkillCategory {
  code: string;
  name: LocalizedText;
  sortOrder: number;
}

export interface GithubSkillSnapshot {
  repo: string;
  name: string;
  descriptionZh: string;
  descriptionEn: string;
  readmeSnippetZh: string;
  readmeSnippetEn: string;
  categoryCode: string;
  categoryName: LocalizedText;
  tags: string[];
  audiences: AudienceKey[];
  useCases: LocalizedText[];
  ecosystems: EcosystemMetric[];
  hnMetric?: HnMetric;
  productHuntVotes?: number;
  relatedMCPs: string[];
  skillMdPaths: string[];
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  language: string;
  license: string;
  topics: string[];
  homepage: string;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  lastFetchedAt: string;
  fetchStatus: FetchStatus;
  errorMessage?: string;
  rank: number;
  rankByCategory: number;
  popularityScore: number;
  activityScore: number;
  adoptionScore: number;
  officialScore: number;
  ecosystemScore: number;
  compositeScore: number;
  growth7d: number | null;
  growth30d: number | null;
  rankDelta7d: number | null;
  rankDelta30d: number | null;
  trendStatus: TrendStatus;
  chineseScore: number;
  skillSignalScore: number;
  releaseCount: number;
  latestRelease?: string;
  weeklyCommits: number;
  contributors: number;
  featured: boolean;
}

export interface SnapshotPayload {
  schemaVersion: 3;
  generatedAt: string;
  source: string;
  categories: SkillCategory[];
  skills: GithubSkillSnapshot[];
  ecosystemBreakdown: Record<EcosystemKey, number>;
  totalEcosystemSources: number;
  lastEcosystemSync?: string;
  hnMentionsCount: number;
  errorMessage?: string;
}

export interface CandidateSkill {
  repo: string;
  name: string;
  description: string;
  stars: number;
  forks: number;
  htmlUrl: string;
  language: string;
  topics: string[];
  skillMdPaths: string[];
  matchedQuery: string;
  reason: LocalizedText;
  alreadyCurated: boolean;
  suggestedCategory: string;
  suggestedAudiences: AudienceKey[];
  confidence: number;
}

export interface CandidatesPayload {
  generatedAt: string;
  source: string;
  candidates: CandidateSkill[];
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
  schemaVersion: 3;
  generatedAt: string;
  retentionDays: number;
  repositories: RepoHistory[];
}
