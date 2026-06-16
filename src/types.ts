export type Locale = "zh" | "en";
export type SortKey = "heat" | "uses" | "views" | "updated" | "name";
export type AudienceKey =
  | "media"
  | "wechat"
  | "xiaohongshu"
  | "douyin"
  | "data"
  | "productivity"
  | "developer";
export type SpotlightKey =
  | "hot"
  | "recommended"
  | "new"
  | "topUses"
  | "recentlyUpdated"
  | "growth7d"
  | "growth30d"
  | "rankRisers";
export type TrendStatus = "ready" | "collecting";
export type FetchStatus = "ok" | "fallback" | "error";

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface RedfoxCategory {
  id?: number;
  code: string;
  name: LocalizedText;
  sortOrder: number;
}

export interface AccessMethod {
  name: string;
  value: string;
  url?: string;
}

export interface RedfoxSkillSnapshot {
  skillNo: string;
  skillCode: string;
  name: LocalizedText;
  description: LocalizedText;
  introduce: LocalizedText;
  readme: LocalizedText;
  categoryCode: string;
  categoryName: LocalizedText;
  categories: RedfoxCategory[];
  tags: string[];
  icon: string;
  iconUrl: string;
  price: number;
  usageCount: number;
  viewCount: number;
  downloadCount: number;
  displayStatus: number;
  displayBadge: LocalizedText | null;
  status: number;
  hasApiKey: boolean;
  platformInfoRaw: string;
  accessMethods: AccessMethod[];
  redfoxUrl: string;
  githubUrl: string;
  githubPath: string;
  heatScore: number;
  rank: number;
  rankByCategory: number;
  createdAt: string;
  updatedAt: string;
  lastFetchedAt: string;
  fetchStatus: FetchStatus;
  errorMessage?: string;
  downloadGrowth7d: number | null;
  downloadGrowth30d: number | null;
  rankDelta7d: number | null;
  rankDelta30d: number | null;
  trendStatus: TrendStatus;
  audiences: AudienceKey[];
  useCases: LocalizedText[];
}

export interface SnapshotPayload {
  schemaVersion: 2;
  generatedAt: string;
  source: string;
  categories: RedfoxCategory[];
  skills: RedfoxSkillSnapshot[];
  sourceRepo: {
    fullName: string;
    htmlUrl: string;
  };
  errorMessage?: string;
}

export interface CandidatesPayload {
  generatedAt: string;
  source: string;
  candidates: never[];
}

export interface TrendSample {
  date: string;
  downloadCount: number;
  viewCount: number;
  heatScore: number;
  rank: number;
  rankByCategory: number;
}

export interface SkillHistory {
  skillCode: string;
  samples: TrendSample[];
}

export interface HistoryPayload {
  schemaVersion: 2;
  generatedAt: string;
  retentionDays: number;
  skills: SkillHistory[];
}
