import type {
  AudienceKey,
  CandidateRepo,
  Category,
  Locale,
  LocalizedText,
  QualitySignals,
  Freshness,
  SkillRepoSnapshot,
  SpotlightKey,
  SortKey,
} from "../types";

export interface RepoFilters {
  query: string;
  category: string;
  platform: string;
  tag: string;
  license: string;
  language: string;
  sortKey: SortKey;
  audience: AudienceKey | "";
  spotlight: SpotlightKey | "";
  favoritesOnly: boolean;
}

export const defaultRepoFilters: RepoFilters = {
  query: "",
  category: "",
  platform: "",
  tag: "",
  license: "",
  language: "",
  sortKey: "stars",
  audience: "",
  spotlight: "",
  favoritesOnly: false,
};

export const audienceKeys: AudienceKey[] = [
  "developer",
  "creator",
  "designMarketing",
  "research",
  "productivity",
  "mcp",
];

export const spotlightKeys: SpotlightKey[] = [
  "weeklyHot",
  "growth7d",
  "growth30d",
  "rankRisers",
  "classicStars",
  "recentlyActive",
  "beginnerFriendly",
  "creatorPicks",
  "developerStack",
];

export interface AudienceProfile {
  key: AudienceKey;
  label: LocalizedText;
  description: LocalizedText;
  categories: Category[];
  platforms: string[];
  tags: string[];
}

export interface SpotlightView {
  key: SpotlightKey;
  label: LocalizedText;
  description: LocalizedText;
}

export const audienceProfiles: Record<AudienceKey, AudienceProfile> = {
  developer: {
    key: "developer",
    label: { zh: "程序员", en: "Developers" },
    description: {
      zh: "代码助手、CLI、IDE、Agent 框架和工程自动化。",
      en: "Coding assistants, CLIs, IDE tools, agent frameworks, and engineering automation.",
    },
    categories: ["Developer Tools", "Coding Agents", "MCP & Tooling"],
    platforms: ["CLI", "VS Code", "IDE", "Git", "Developers", "Agents"],
    tags: ["coding-agent", "terminal", "sdk", "software-engineering"],
  },
  creator: {
    key: "creator",
    label: { zh: "自媒体创作者", en: "Creators" },
    description: {
      zh: "文档整理、语音、OCR、长文研究和内容生产工作流。",
      en: "Document processing, voice, OCR, long-form research, and content production workflows.",
    },
    categories: ["Creator & Content", "Design & Media", "Prompt & Workflow"],
    platforms: ["Creators", "Audio", "Voice", "Documents", "Writing", "Images"],
    tags: ["content", "tts", "ocr", "research-writing", "document-conversion"],
  },
  designMarketing: {
    key: "designMarketing",
    label: { zh: "设计/营销", en: "Design/Marketing" },
    description: {
      zh: "图像生成、创意工作流、广告素材和商业视觉工具。",
      en: "Image generation, creative workflows, campaign assets, and commercial visual tooling.",
    },
    categories: ["Design & Media", "Creator & Content", "Productivity"],
    platforms: ["Images", "Workflows", "Creators", "Low-code"],
    tags: ["image-generation", "nodes", "content"],
  },
  research: {
    key: "research",
    label: { zh: "研究分析", en: "Research" },
    description: {
      zh: "RAG、网页抓取、知识库、课程和资料研究工具。",
      en: "RAG, crawling, knowledge bases, courses, and research tooling.",
    },
    categories: ["Data & Research", "Learning & Docs"],
    platforms: ["RAG", "Web", "Learning", "Python"],
    tags: ["rag", "data", "knowledge", "web-crawling", "course"],
  },
  productivity: {
    key: "productivity",
    label: { zh: "效率办公", en: "Productivity" },
    description: {
      zh: "低代码、自动化、知识库、聊天界面和工作流编排。",
      en: "Low-code builders, automation, knowledge apps, chat UIs, and workflow orchestration.",
    },
    categories: ["Productivity", "Prompt & Workflow"],
    platforms: ["Automation", "Low-code", "Workflows", "Apps", "Chat"],
    tags: ["automation", "low-code", "ai-workflows"],
  },
  mcp: {
    key: "mcp",
    label: { zh: "MCP 玩家", en: "MCP Builders" },
    description: {
      zh: "MCP 服务、SDK、工具连接和 Agent 集成生态。",
      en: "MCP servers, SDKs, tool connections, and agent integration ecosystems.",
    },
    categories: ["MCP & Tooling", "Developer Tools"],
    platforms: ["MCP", "TypeScript"],
    tags: ["mcp", "tools", "integrations", "sdk"],
  },
};

export const spotlightViews: Record<SpotlightKey, SpotlightView> = {
  weeklyHot: {
    key: "weeklyHot",
    label: { zh: "本周热门", en: "Hot now" },
    description: {
      zh: "用当前星标、精选和近期活跃度估算，历史涨星会在 V2 接入。",
      en: "Estimated from current stars, featured status, and recent activity; star growth lands in V2.",
    },
  },
  growth7d: {
    key: "growth7d",
    label: { zh: "7 天涨星榜", en: "7-day growth" },
    description: {
      zh: "按过去 7 天新增 star 排序；历史不足时回退到当前星标。",
      en: "Ranks by stars gained over the last 7 days; falls back to current stars while collecting.",
    },
  },
  growth30d: {
    key: "growth30d",
    label: { zh: "30 天涨星榜", en: "30-day growth" },
    description: {
      zh: "按过去 30 天新增 star 排序，适合观察持续热度。",
      en: "Ranks by stars gained over 30 days for steadier momentum signals.",
    },
  },
  rankRisers: {
    key: "rankRisers",
    label: { zh: "排名上升最快", en: "Fastest risers" },
    description: {
      zh: "优先看 7 天排名提升，其次看 7 天涨星。",
      en: "Prioritizes 7-day rank movement, then 7-day star growth.",
    },
  },
  classicStars: {
    key: "classicStars",
    label: { zh: "高星经典", en: "Star classics" },
    description: {
      zh: "星标基础强、长期被社区验证的项目。",
      en: "Projects with strong star bases and long-running community validation.",
    },
  },
  recentlyActive: {
    key: "recentlyActive",
    label: { zh: "最近活跃", en: "Recently active" },
    description: {
      zh: "近期仍在更新或推送的仓库，适合优先试用。",
      en: "Repositories with recent updates or pushes, good for first evaluation.",
    },
  },
  beginnerFriendly: {
    key: "beginnerFriendly",
    label: { zh: "适合入门", en: "Beginner friendly" },
    description: {
      zh: "课程、指南、示例和低门槛工具。",
      en: "Courses, guides, examples, and approachable tools.",
    },
  },
  creatorPicks: {
    key: "creatorPicks",
    label: { zh: "内容创作者精选", en: "Creator picks" },
    description: {
      zh: "适合选题、资料整理、图像、语音和内容生产。",
      en: "Useful for topic research, asset preparation, visuals, voice, and content production.",
    },
  },
  developerStack: {
    key: "developerStack",
    label: { zh: "开发者工具链", en: "Developer stack" },
    description: {
      zh: "从代码助手到 MCP 集成的开发者工作台。",
      en: "A developer bench from coding assistants to MCP integrations.",
    },
  },
};

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getFilterOptions(repositories: SkillRepoSnapshot[]) {
  return {
    categories: uniqueSorted(repositories.map((repo) => repo.category)),
    platforms: uniqueSorted(repositories.flatMap((repo) => repo.platforms)),
    tags: uniqueSorted(repositories.flatMap((repo) => repo.tags)),
    licenses: uniqueSorted(repositories.map((repo) => repo.license)),
    languages: uniqueSorted(repositories.map((repo) => repo.language)),
  };
}

function searchableText(repo: SkillRepoSnapshot, locale: Locale) {
  return [
    repo.repo,
    repo.fullName,
    repo.category,
    repo.language,
    repo.license,
    repo.description,
    repo.summary.zh,
    repo.summary.en,
    repo.summary[locale],
    repo.difficulty ?? "",
    repo.status ?? "",
    ...(repo.audiences ?? []),
    ...(repo.useCases ?? []).flatMap((useCase) => [useCase.zh, useCase.en]),
    ...repo.platforms,
    ...repo.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function hasAny(source: string[], targets: string[]) {
  const normalized = new Set(source.map((item) => item.toLowerCase()));
  return targets.some((target) => normalized.has(target.toLowerCase()));
}

export function matchesAudience(
  repo: SkillRepoSnapshot,
  audience: AudienceKey,
) {
  if (repo.audiences?.includes(audience)) return true;
  const profile = audienceProfiles[audience];
  return (
    profile.categories.includes(repo.category) ||
    hasAny(repo.platforms, profile.platforms) ||
    hasAny(repo.tags, profile.tags)
  );
}

export function inferAudiences(repo: SkillRepoSnapshot): AudienceKey[] {
  const explicit = repo.audiences?.filter((audience) =>
    audienceKeys.includes(audience),
  );
  if (explicit?.length) return explicit;

  const inferred = audienceKeys.filter((audience) =>
    matchesAudience(repo, audience),
  );
  return inferred.length ? inferred : ["productivity"];
}

export function deriveUseCases(repo: SkillRepoSnapshot): LocalizedText[] {
  if (repo.useCases?.length) return repo.useCases;

  const audiences = inferAudiences(repo);
  const useCases: LocalizedText[] = [];
  if (audiences.includes("developer")) {
    useCases.push({
      zh: "辅助编码、调试、工程自动化或 Agent 编排",
      en: "Coding, debugging, engineering automation, or agent orchestration",
    });
  }
  if (audiences.includes("creator") || audiences.includes("designMarketing")) {
    useCases.push({
      zh: "内容生产、素材整理、图像/语音工作流",
      en: "Content production, asset preparation, image or voice workflows",
    });
  }
  if (audiences.includes("research")) {
    useCases.push({
      zh: "资料研究、RAG、网页抓取或知识库搭建",
      en: "Research, RAG, web crawling, or knowledge base building",
    });
  }
  if (audiences.includes("mcp")) {
    useCases.push({
      zh: "连接工具、服务和 Agent 的 MCP 集成",
      en: "MCP integrations connecting tools, services, and agents",
    });
  }
  return useCases.slice(0, 3);
}

function daysSince(value: string) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - timestamp) / 86_400_000);
}

function recentActivityDays(repo: SkillRepoSnapshot) {
  return Math.min(daysSince(repo.pushedAt), daysSince(repo.updatedAt));
}

export function inferFreshness(repo: SkillRepoSnapshot): Freshness {
  if (repo.archived || repo.disabled) return "stale";
  const age = recentActivityDays(repo);
  if (!Number.isFinite(age)) return "unknown";
  if (age <= 30) return "fresh";
  if (age <= 180) return "active";
  if (age <= 540) return "quiet";
  return "stale";
}

export function buildQualitySignals(repo: SkillRepoSnapshot): QualitySignals {
  const age = recentActivityDays(repo);
  const issueLoad =
    repo.openIssues === undefined
      ? "unknown"
      : repo.openIssues < 10
        ? "low"
        : repo.openIssues < 50
          ? "medium"
          : "high";

  return {
    hasLicense: Boolean(repo.license && repo.license !== "NOASSERTION"),
    hasHomepage: Boolean(repo.homepage),
    recentlyPushed: Number.isFinite(age) ? age <= 90 : false,
    archived: Boolean(repo.archived || repo.disabled),
    issueLoad,
  };
}

function matchesSpotlight(repo: SkillRepoSnapshot, spotlight: SpotlightKey) {
  const audiences = inferAudiences(repo);
  const tagText = repo.tags.join(" ").toLowerCase();
  const age = recentActivityDays(repo);

  if (
    spotlight === "growth7d" ||
    spotlight === "growth30d" ||
    spotlight === "rankRisers"
  ) {
    return true;
  }
  if (spotlight === "weeklyHot") return repo.featured || age <= 120;
  if (spotlight === "classicStars")
    return repo.stars >= 10_000 || repo.featured;
  if (spotlight === "recentlyActive") return age <= 180;
  if (spotlight === "beginnerFriendly") {
    return (
      repo.difficulty === "Beginner" ||
      repo.category === "Learning & Docs" ||
      /\b(course|guide|learning|examples?|prompt-engineering)\b/.test(tagText)
    );
  }
  if (spotlight === "creatorPicks") {
    return (
      audiences.includes("creator") || audiences.includes("designMarketing")
    );
  }
  return audiences.includes("developer") || audiences.includes("mcp");
}

function nullableNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function compareNullableDesc(
  aValue: number | null | undefined,
  bValue: number | null | undefined,
) {
  const aNumber = nullableNumber(aValue);
  const bNumber = nullableNumber(bValue);
  if (aNumber === null && bNumber === null) return 0;
  if (aNumber === null) return 1;
  if (bNumber === null) return -1;
  return bNumber - aNumber;
}

function compareTrendSpotlight(
  a: SkillRepoSnapshot,
  b: SkillRepoSnapshot,
  spotlight: SpotlightKey,
) {
  if (spotlight === "growth7d") {
    return (
      compareNullableDesc(a.growth7d, b.growth7d) ||
      compareNullableDesc(a.rankDelta7d, b.rankDelta7d)
    );
  }
  if (spotlight === "growth30d") {
    return (
      compareNullableDesc(a.growth30d, b.growth30d) ||
      compareNullableDesc(a.rankDelta30d, b.rankDelta30d)
    );
  }
  if (spotlight === "rankRisers") {
    return (
      compareNullableDesc(a.rankDelta7d, b.rankDelta7d) ||
      compareNullableDesc(a.growth7d, b.growth7d)
    );
  }
  return 0;
}

function spotlightScore(repo: SkillRepoSnapshot, spotlight: SpotlightKey) {
  const age = recentActivityDays(repo);
  const recencyBoost = Number.isFinite(age) ? Math.max(0, 240 - age) * 25 : 0;
  const featuredBoost = repo.featured ? 12_000 : 0;
  if (spotlight === "weeklyHot")
    return repo.stars + recencyBoost + featuredBoost;
  if (spotlight === "recentlyActive") return recencyBoost + repo.stars / 8;
  if (spotlight === "beginnerFriendly") return featuredBoost + repo.stars;
  return repo.stars + featuredBoost;
}

export function filterAndSortRepositories(
  repositories: SkillRepoSnapshot[],
  filters: RepoFilters,
  locale: Locale,
  favoriteRepos: ReadonlySet<string> = new Set(),
) {
  const query = filters.query.trim().toLowerCase();

  return repositories
    .filter((repo) => {
      if (filters.favoritesOnly && !favoriteRepos.has(repo.repo.toLowerCase()))
        return false;
      if (query && !searchableText(repo, locale).includes(query)) return false;
      if (filters.category && repo.category !== filters.category) return false;
      if (filters.platform && !repo.platforms.includes(filters.platform))
        return false;
      if (filters.tag && !repo.tags.includes(filters.tag)) return false;
      if (filters.license && repo.license !== filters.license) return false;
      if (filters.language && repo.language !== filters.language) return false;
      if (filters.audience && !matchesAudience(repo, filters.audience))
        return false;
      if (filters.spotlight && !matchesSpotlight(repo, filters.spotlight))
        return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.spotlight) {
        const trendScore = compareTrendSpotlight(a, b, filters.spotlight);
        if (trendScore !== 0) return trendScore;

        return (
          spotlightScore(b, filters.spotlight) -
            spotlightScore(a, filters.spotlight) ||
          b.stars - a.stars ||
          a.repo.localeCompare(b.repo)
        );
      }
      if (filters.sortKey === "forks")
        return b.forks - a.forks || a.repo.localeCompare(b.repo);
      if (filters.sortKey === "updated") {
        return Date.parse(b.updatedAt || "0") - Date.parse(a.updatedAt || "0");
      }
      if (filters.sortKey === "name") return a.repo.localeCompare(b.repo);
      return b.stars - a.stars || a.repo.localeCompare(b.repo);
    });
}

export function calculateStats(
  repositories: SkillRepoSnapshot[],
  generatedAt: string,
) {
  const activeCount = repositories.filter(
    (repo) =>
      inferFreshness(repo) === "fresh" || inferFreshness(repo) === "active",
  ).length;
  return {
    totalRepos: repositories.length,
    totalStars: repositories.reduce((sum, repo) => sum + repo.stars, 0),
    totalCategories: new Set(repositories.map((repo) => repo.category)).size,
    activeCount,
    generatedAt,
  };
}

export function enrichRepositories(repositories: SkillRepoSnapshot[]) {
  const globalRanks = new Map(
    [...repositories]
      .sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo))
      .map((repo, index) => [repo.repo, index + 1]),
  );
  const categoryRanks = new Map<string, number>();

  for (const category of uniqueSorted(
    repositories.map((repo) => repo.category),
  )) {
    [...repositories]
      .filter((repo) => repo.category === category)
      .sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo))
      .forEach((repo, index) => {
        categoryRanks.set(repo.repo, index + 1);
      });
  }

  return repositories.map((repo) => ({
    ...repo,
    rank: globalRanks.get(repo.repo) ?? repo.rank,
    rankByCategory: categoryRanks.get(repo.repo) ?? repo.rankByCategory,
    freshness: inferFreshness(repo),
    qualitySignals: buildQualitySignals(repo),
    growth7d: repo.growth7d ?? null,
    growth30d: repo.growth30d ?? null,
    rankDelta7d: repo.rankDelta7d ?? null,
    rankDelta30d: repo.rankDelta30d ?? null,
    trendStatus:
      repo.trendStatus ??
      (repo.growth7d === null ||
      repo.growth7d === undefined ||
      repo.growth30d === null ||
      repo.growth30d === undefined
        ? "collecting"
        : "ready"),
  }));
}

export function topCandidates(candidates: CandidateRepo[], limit = 8) {
  return [...candidates]
    .filter(
      (candidate) =>
        !candidate.alreadyCurated && candidate.fetchStatus !== "error",
    )
    .sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo))
    .slice(0, limit);
}

export function getRelatedRepositories(
  target: SkillRepoSnapshot,
  repositories: SkillRepoSnapshot[],
  limit = 4,
) {
  const targetAudiences = inferAudiences(target);
  return repositories
    .filter((repo) => repo.repo !== target.repo)
    .map((repo) => {
      const sharedTags = repo.tags.filter((tag) => target.tags.includes(tag));
      const sharedPlatforms = repo.platforms.filter((platform) =>
        target.platforms.includes(platform),
      );
      const sharedAudiences = inferAudiences(repo).filter((audience) =>
        targetAudiences.includes(audience),
      );
      const score =
        (repo.category === target.category ? 6 : 0) +
        sharedTags.length * 3 +
        sharedPlatforms.length * 2 +
        sharedAudiences.length +
        Math.min(repo.stars / 10_000, 4);
      return { repo, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.repo.stars - a.repo.stars)
    .slice(0, limit)
    .map((item) => item.repo);
}
