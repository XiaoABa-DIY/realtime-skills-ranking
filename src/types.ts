// Agent Skills Radar - Schema v4
// Upgraded from GitHub Skills Ranking (schema v3)

export type Locale = "zh" | "en";

export type SortKey =
  | "radarScore"
  | "stars"
  | "forks"
  | "updated"
  | "name"
  | "popularity"
  | "activity"
  | "growth"
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

export type SkillPlatform =
  | "claude"
  | "codex"
  | "copilot"
  | "generic"
  | "unknown";

export type SkillSource =
  | "manual"
  | "github"
  | "github-code-search"
  | "github-topic"
  | "anthropic-official"
  | "openai-codex-docs"
  | "copilot-docs"
  | "huggingface"
  | "hackernews"
  | "producthunt";

export type SafetyLevel = "safe" | "review" | "warning" | "unsafe";

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface SkillCategory {
  code: string;
  name: LocalizedText;
  sortOrder: number;
}

export interface EcosystemMetric {
  ecosystem: string;
  compatible: boolean;
  verified: boolean;
  badge?: string;
}

export interface HnMetric {
  mentions30d: number;
  points: number;
  comments: number;
}

export interface SourceEntry {
  source: SkillSource;
  fetchedAt: string;
  ok: boolean;
  errors?: string[];
}

export interface GithubSkillSnapshot {
  // Identity
  id: string;
  repo: string;
  name: string;
  descriptionZh: string;
  descriptionEn: string;
  homepage?: string;
  htmlUrl: string;

  // Classification
  categoryCode: string;
  categoryName: LocalizedText;
  platform: SkillPlatform;
  tags: string[];
  audiences: AudienceKey[];
  useCases: LocalizedText[];
  readmeSnippetZh?: string;
  readmeSnippetEn?: string;

  // Skill signals
  skillMdPaths: string[];
  hasSkillMd: boolean;
  hasReadme: boolean;
  hasRelease: boolean;
  skillSignalScore: number;

  // Ecosystem
  ecosystems: EcosystemMetric[];
  relatedMCPs: string[];

  // GitHub metrics
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  language: string;
  license: string;
  topics: string[];
  createdAt: string;
  updatedAt: string;
  pushedAt: string;

  // Data sources
  sources: SourceEntry[];
  primarySource: SkillSource;

  // Scores (0-100)
  popularityScore: number;
  adoptionScore?: number;
  officialScore?: number;
  activityScore: number;
  growthScore: number;
  ecosystemScore: number;
  safetyScore: number;
  radarScore: number;
  compositeScore: number;

  // Rankings
  rank: number;
  rankByCategory: number;
  growth7d: number | null;
  growth30d: number | null;
  rankDelta7d: number | null;
  rankDelta30d: number | null;
  trendStatus: TrendStatus;

  // Localization
  chineseScore: number;

  // Activity metadata
  releaseCount: number;
  latestRelease?: string;
  weeklyCommits: number;
  contributors: number;

  // Safety
  safetyLevel: SafetyLevel;
  safetyNotes: string[];

  // Status
  featured: boolean;
  lastFetchedAt: string;
  fetchStatus: FetchStatus;
  errorMessage?: string;
}

export interface SnapshotPayload {
  schemaVersion: 4;
  generatedAt: string;
  source: string;
  categories: SkillCategory[];
  skills: GithubSkillSnapshot[];
  ecosystemBreakdown: Record<string, number>;
  platformBreakdown: Record<SkillPlatform, number>;
  sourceBreakdown: Record<SkillSource, number>;
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
  suggestedPlatform: SkillPlatform;
  suggestedSources: SkillSource[];
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
  schemaVersion: number;
  generatedAt: string;
  retentionDays: number;
  repositories: RepoHistory[];
}

export interface DataSourceStatus {
  generatedAt: string;
  sources: {
    id: string;
    name: string;
    enabled: boolean;
    status: "ok" | "partial" | "skipped" | "error";
    items: number;
    lastUpdatedAt: string;
    requiresToken: boolean;
    purpose: LocalizedText;
  }[];
}
