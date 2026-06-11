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

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface SkillRepoInput {
  repo: string;
  category: Category;
  platforms: string[];
  tags: string[];
  summary: LocalizedText;
  homepage?: string;
  featured?: boolean;
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
