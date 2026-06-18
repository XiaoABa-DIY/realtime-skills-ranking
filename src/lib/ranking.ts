import type {
  AudienceKey,
  GithubSkillSnapshot,
  Locale,
  LocalizedText,
  SortKey,
  SpotlightKey,
} from "../types";

export interface SkillFilters {
  query: string;
  category: string;
  tag: string;
  sortKey: SortKey;
  audience: AudienceKey | "";
  spotlight: SpotlightKey | "";
  favoritesOnly: boolean;
}

export const defaultSkillFilters: SkillFilters = {
  query: "",
  category: "",
  tag: "",
  sortKey: "stars",
  audience: "",
  spotlight: "",
  favoritesOnly: false,
};

export const audienceKeys: AudienceKey[] = [
  "media",
  "developer",
  "writing",
  "design",
  "data",
  "productivity",
  "beginner",
];

export const spotlightKeys: SpotlightKey[] = [
  "topStars",
  "featured",
  "chineseFriendly",
  "recentlyUpdated",
  "growth7d",
  "growth30d",
  "rankRisers",
];

export interface AudienceProfile {
  key: AudienceKey;
  label: LocalizedText;
  description: LocalizedText;
  matchers: string[];
}

export interface SpotlightView {
  key: SpotlightKey;
  label: LocalizedText;
  description: LocalizedText;
}

export const audienceProfiles: Record<AudienceKey, AudienceProfile> = {
  media: {
    key: "media",
    label: { zh: "自媒体", en: "Media creators" },
    description: {
      zh: "选题、改写、账号运营和跨平台内容生产。",
      en: "Topics, rewriting, account operations, and cross-platform content.",
    },
    matchers: ["自媒体", "公众号", "小红书", "抖音", "creator", "content"],
  },
  developer: {
    key: "developer",
    label: { zh: "程序员", en: "Developers" },
    description: {
      zh: "面向编码、工程规范、代码审查和开发工作流的 Skill。",
      en: "Skills for coding, engineering rules, reviews, and dev workflows.",
    },
    matchers: ["代码", "编程", "开发", "codex", "coding", "developer", "cli"],
  },
  writing: {
    key: "writing",
    label: { zh: "写作提示词", en: "Writing prompts" },
    description: {
      zh: "文章、报告、提示词、改写和编辑工作流。",
      en: "Articles, reports, prompts, rewriting, and editing workflows.",
    },
    matchers: ["写作", "提示词", "prompt", "rewrite", "article", "report"],
  },
  design: {
    key: "design",
    label: { zh: "设计素材", en: "Design assets" },
    description: {
      zh: "视觉设计、图片、多媒体和品牌素材生产。",
      en: "Visual design, media, brand assets, and creative production.",
    },
    matchers: ["设计", "视觉", "图片", "media", "image", "design"],
  },
  data: {
    key: "data",
    label: { zh: "数据分析", en: "Data analysis" },
    description: {
      zh: "资料研究、数据提取、搜索、榜单和结构化报告。",
      en: "Research, extraction, search, rankings, and structured reports.",
    },
    matchers: ["数据", "研究", "检索", "搜索", "research", "data", "rag"],
  },
  productivity: {
    key: "productivity",
    label: { zh: "效率办公", en: "Productivity" },
    description: {
      zh: "文档处理、批量操作、格式转换和办公提效。",
      en: "Documents, batch work, conversion, and office productivity.",
    },
    matchers: ["效率", "办公", "文档", "pdf", "tool", "productivity"],
  },
  beginner: {
    key: "beginner",
    label: { zh: "入门友好", en: "Beginner friendly" },
    description: {
      zh: "中文说明清楚、安装路径明确、适合第一次尝试 Skill。",
      en: "Clear docs and setup paths for first-time skill users.",
    },
    matchers: ["入门", "教程", "中文", "guide", "tutorial", "learn"],
  },
};

export const spotlightViews: Record<SpotlightKey, SpotlightView> = {
  topStars: {
    key: "topStars",
    label: { zh: "高星榜", en: "Top stars" },
    description: {
      zh: "按 GitHub Stars 展示开源热度最高的 Skills。",
      en: "Open-source skills ranked by GitHub stars.",
    },
  },
  featured: {
    key: "featured",
    label: { zh: "人工精选", en: "Featured" },
    description: {
      zh: "人工标记的中文友好或特别值得尝试的 Skill。",
      en: "Manually highlighted Chinese-friendly or especially useful skills.",
    },
  },
  chineseFriendly: {
    key: "chineseFriendly",
    label: { zh: "中文友好", en: "Chinese friendly" },
    description: {
      zh: "中文 README、中文 SKILL.md 或中文摘要更充分的项目。",
      en: "Projects with stronger Chinese README, SKILL.md, or summaries.",
    },
  },
  recentlyUpdated: {
    key: "recentlyUpdated",
    label: { zh: "最近更新", en: "Recently updated" },
    description: {
      zh: "优先查看最近仍在维护的 Skill 项目。",
      en: "Skills with fresher GitHub activity.",
    },
  },
  growth7d: {
    key: "growth7d",
    label: { zh: "7 天涨星榜", en: "7-day star growth" },
    description: {
      zh: "历史足够后按 7 天新增 Stars 排序。",
      en: "Ranks by 7-day star growth once history is available.",
    },
  },
  growth30d: {
    key: "growth30d",
    label: { zh: "30 天涨星榜", en: "30-day star growth" },
    description: {
      zh: "历史足够后按 30 天新增 Stars 排序。",
      en: "Ranks by 30-day star growth once history is available.",
    },
  },
  rankRisers: {
    key: "rankRisers",
    label: { zh: "排名上升最快", en: "Fastest risers" },
    description: {
      zh: "按 7 天排名变化排序，历史不足时回退到 Stars。",
      en: "Sorts by 7-day rank movement, falling back to stars.",
    },
  },
};

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function getFilterOptions(skills: GithubSkillSnapshot[]) {
  return {
    categories: uniqueSorted(skills.map((skill) => skill.categoryCode)),
    tags: uniqueSorted(skills.flatMap((skill) => skill.tags)),
  };
}

function skillText(skill: GithubSkillSnapshot, locale: Locale) {
  return [
    skill.repo,
    skill.name,
    skill.descriptionZh,
    skill.descriptionEn,
    locale === "zh" ? skill.readmeSnippetZh : skill.readmeSnippetEn,
    skill.readmeSnippetZh,
    skill.readmeSnippetEn,
    skill.categoryCode,
    skill.categoryName.zh,
    skill.categoryName.en,
    skill.license,
    skill.language,
    ...skill.skillMdPaths,
    ...skill.audiences,
    ...skill.tags,
    ...skill.topics,
    ...(skill.useCases ?? []).flatMap((item) => [item.zh, item.en]),
  ]
    .join(" ")
    .toLowerCase();
}

function matcherText(skill: GithubSkillSnapshot) {
  return [
    skill.repo,
    skill.name,
    skill.descriptionZh,
    skill.descriptionEn,
    skill.readmeSnippetZh,
    skill.categoryCode,
    skill.categoryName.zh,
    ...skill.tags,
    ...skill.topics,
    ...skill.skillMdPaths,
  ]
    .join(" ")
    .toLowerCase();
}

export function inferAudiences(skill: GithubSkillSnapshot): AudienceKey[] {
  if (skill.audiences?.length) return skill.audiences;

  const text = matcherText(skill);
  const inferred = audienceKeys.filter((audience) =>
    audienceProfiles[audience].matchers.some((matcher) =>
      text.includes(matcher.toLowerCase()),
    ),
  );

  return inferred.length ? inferred : ["beginner"];
}

export function matchesAudience(
  skill: GithubSkillSnapshot,
  audience: AudienceKey,
) {
  return inferAudiences(skill).includes(audience);
}

function matchesSpotlight(skill: GithubSkillSnapshot, spotlight: SpotlightKey) {
  if (
    spotlight === "growth7d" ||
    spotlight === "growth30d" ||
    spotlight === "rankRisers" ||
    spotlight === "topStars" ||
    spotlight === "recentlyUpdated"
  ) {
    return true;
  }
  if (spotlight === "featured") return skill.featured;
  return skill.chineseScore >= 45;
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

function compareByUpdated(a: GithubSkillSnapshot, b: GithubSkillSnapshot) {
  return (
    Date.parse(b.pushedAt || b.updatedAt || "0") -
    Date.parse(a.pushedAt || a.updatedAt || "0")
  );
}

function compareDefault(a: GithubSkillSnapshot, b: GithubSkillSnapshot) {
  return (
    b.stars - a.stars ||
    b.chineseScore - a.chineseScore ||
    compareByUpdated(a, b) ||
    a.repo.localeCompare(b.repo)
  );
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function recencyScore(skill: GithubSkillSnapshot, now: number) {
  const updatedAt = Date.parse(skill.pushedAt || skill.updatedAt || "");
  if (!Number.isFinite(updatedAt)) return 10;
  const ageDays = Math.max(0, (now - updatedAt) / 86_400_000);
  if (ageDays <= 30) return 100;
  if (ageDays <= 90) return 70;
  if (ageDays <= 180) return 35;
  return 10;
}

export function calculateSkillQualityScore(
  skill: GithubSkillSnapshot,
  now = Date.now(),
) {
  const docsLength = `${skill.readmeSnippetZh ?? ""} ${
    skill.readmeSnippetEn ?? ""
  }`.trim().length;
  const docsScore = clampScore((docsLength / 800) * 100);
  const heatScore = clampScore(
    (Math.log(skill.stars + skill.forks * 2 + 1) / Math.log(100_000)) * 100,
  );
  const licenseScore = skill.license ? 100 : 40;

  return Math.round(
    clampScore(skill.skillSignalScore) * 0.3 +
      docsScore * 0.2 +
      recencyScore(skill, now) * 0.2 +
      heatScore * 0.15 +
      clampScore(skill.chineseScore) * 0.1 +
      licenseScore * 0.05,
  );
}

function compareTrendSpotlight(
  a: GithubSkillSnapshot,
  b: GithubSkillSnapshot,
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

export function filterAndSortSkills(
  skills: GithubSkillSnapshot[],
  filters: SkillFilters,
  locale: Locale,
  favoriteSkills: ReadonlySet<string> = new Set(),
) {
  const query = filters.query.trim().toLowerCase();

  return skills
    .filter((skill) => {
      if (
        filters.favoritesOnly &&
        !favoriteSkills.has(skill.repo.toLowerCase())
      ) {
        return false;
      }
      if (query && !skillText(skill, locale).includes(query)) return false;
      if (filters.category && skill.categoryCode !== filters.category) {
        return false;
      }
      if (filters.tag && !skill.tags.includes(filters.tag)) return false;
      if (filters.audience && !matchesAudience(skill, filters.audience)) {
        return false;
      }
      if (filters.spotlight && !matchesSpotlight(skill, filters.spotlight)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.spotlight) {
        const trend = compareTrendSpotlight(a, b, filters.spotlight);
        if (trend !== 0) return trend;
        if (filters.spotlight === "recentlyUpdated") {
          return compareByUpdated(a, b) || compareDefault(a, b);
        }
        if (filters.spotlight === "chineseFriendly") {
          return b.chineseScore - a.chineseScore || compareDefault(a, b);
        }
        return compareDefault(a, b);
      }

      if (filters.sortKey === "forks") {
        return b.forks - a.forks || compareDefault(a, b);
      }
      if (filters.sortKey === "updated") {
        return compareByUpdated(a, b) || compareDefault(a, b);
      }
      if (filters.sortKey === "name") {
        return skillName(a, locale).localeCompare(
          skillName(b, locale),
          locale === "zh" ? "zh-CN" : "en-US",
        );
      }
      if (filters.sortKey === "popularity") {
        return (
          (b.popularityScore ?? 0) - (a.popularityScore ?? 0) ||
          compareDefault(a, b)
        );
      }
      if (filters.sortKey === "activity") {
        return (
          (b.activityScore ?? 0) - (a.activityScore ?? 0) ||
          compareDefault(a, b)
        );
      }
      if (filters.sortKey === "ecosystem") {
        return (
          (b.ecosystemScore ?? 0) - (a.ecosystemScore ?? 0) ||
          compareDefault(a, b)
        );
      }
      if (filters.sortKey === "composite") {
        return (
          (b.compositeScore ?? 0) - (a.compositeScore ?? 0) ||
          compareDefault(a, b)
        );
      }
      return compareDefault(a, b);
    });
}

export function calculateRadarScores(
  skill: GithubSkillSnapshot,
): Pick<
  GithubSkillSnapshot,
  | "popularityScore"
  | "activityScore"
  | "growthScore"
  | "ecosystemScore"
  | "safetyScore"
  | "radarScore"
  | "compositeScore"
> {
  const starScore = Math.min(100, Math.log2(Math.max(skill.stars, 1)) * 12);
  const forkScore = Math.min(40, Math.log2(Math.max(skill.forks, 1)) * 8);
  const popularity = Math.min(100, Math.round(starScore + forkScore * 0.5));

  const daysSincePushed = skill.pushedAt
    ? (Date.now() - Date.parse(skill.pushedAt)) / 86400000
    : 999;
  const recencyBonus = Math.max(0, 30 - daysSincePushed) / 30;
  const commitBonus = Math.min(30, skill.weeklyCommits ?? 0 * 2);
  const releaseBonus = Math.min(15, (skill.releaseCount ?? 0) * 3);
  const activity = Math.min(
    100,
    Math.round(recencyBonus * 40 + commitBonus + releaseBonus + 10),
  );

  const growth7d = skill.growth7d ?? 0;
  const growth30d = skill.growth30d ?? 0;
  const growthFrom7d = Math.min(50, growth7d * 5);
  const growthFrom30d = Math.min(30, growth30d * 1.5);
  const growth = Math.min(100, Math.round(growthFrom7d + growthFrom30d + 20));

  const ecoCount = skill.ecosystems?.length ?? 0;
  const hasMcp = skill.ecosystems?.some((e) => e.ecosystem === "mcp") ? 1 : 0;
  const verifiedEcos = skill.ecosystems?.filter((e) => e.verified).length ?? 0;
  const ecosystem = Math.min(
    100,
    Math.round(ecoCount * 12 + hasMcp * 20 + verifiedEcos * 15),
  );

  let safety = 70;
  if (skill.license && skill.license !== "") safety += 10;
  if (skill.contributors && skill.contributors > 1) safety += 10;
  if (skill.openIssues > 50) safety -= 10;
  if (daysSincePushed > 365) safety -= 15;
  if (skill.skillMdPaths.length === 0) safety -= 20;
  safety = Math.min(100, Math.max(0, Math.round(safety)));

  const radarScore = Math.min(
    100,
    Math.round(
      popularity * 0.25 +
        activity * 0.25 +
        growth * 0.2 +
        ecosystem * 0.15 +
        safety * 0.15,
    ),
  );

  return {
    popularityScore: popularity,
    activityScore: activity,
    growthScore: growth,
    ecosystemScore: ecosystem,
    safetyScore: safety,
    radarScore,
    compositeScore: radarScore,
  };
}

export function skillName(skill: GithubSkillSnapshot, locale: Locale) {
  void locale;
  return skill.name || skill.repo.split("/").at(-1) || skill.repo;
}

export function skillSummary(skill: GithubSkillSnapshot, locale: Locale) {
  return (
    (locale === "zh" ? skill.descriptionZh : skill.descriptionEn) ||
    skill.descriptionZh ||
    skill.descriptionEn ||
    skill.repo
  );
}

export function calculateStats(
  skills: GithubSkillSnapshot[],
  generatedAt: string,
) {
  return {
    totalSkills: skills.length,
    totalStars: skills.reduce((sum, skill) => sum + skill.stars, 0),
    totalForks: skills.reduce((sum, skill) => sum + skill.forks, 0),
    totalCategories: new Set(skills.map((skill) => skill.categoryCode)).size,
    chineseFriendly: skills.filter((skill) => skill.chineseScore >= 45).length,
    generatedAt,
  };
}

export function enrichSkills(skills: GithubSkillSnapshot[]) {
  const globalRanks = new Map(
    [...skills]
      .sort(compareDefault)
      .map((skill, index) => [skill.repo, index + 1]),
  );
  const categoryRanks = new Map<string, number>();

  for (const category of uniqueSorted(
    skills.map((skill) => skill.categoryCode),
  )) {
    [...skills]
      .filter((skill) => skill.categoryCode === category)
      .sort(compareDefault)
      .forEach((skill, index) => {
        categoryRanks.set(skill.repo, index + 1);
      });
  }

  return skills.map((skill) => {
    const scores = calculateRadarScores(skill);
    return {
      ...skill,
      ...scores,
      rank: globalRanks.get(skill.repo) ?? skill.rank,
      rankByCategory: categoryRanks.get(skill.repo) ?? skill.rankByCategory,
      audiences: inferAudiences(skill),
      growth7d: skill.growth7d ?? null,
      growth30d: skill.growth30d ?? null,
      rankDelta7d: skill.rankDelta7d ?? null,
      rankDelta30d: skill.rankDelta30d ?? null,
      trendStatus:
        skill.trendStatus ??
        (skill.growth7d === null ||
        skill.growth7d === undefined ||
        skill.growth30d === null ||
        skill.growth30d === undefined
          ? "collecting"
          : "ready"),
      ecosystems: skill.ecosystems ?? [],
      releaseCount: skill.releaseCount ?? 0,
      weeklyCommits: skill.weeklyCommits ?? 0,
      contributors: skill.contributors ?? 0,
      safetyLevel: skill.safetyLevel ?? "safe",
      safetyNotes: skill.safetyNotes ?? [],
      hasSkillMd: skill.hasSkillMd ?? skill.skillMdPaths.length > 0,
      hasReadme:
        skill.hasReadme ?? !!(skill.readmeSnippetZh || skill.readmeSnippetEn),
      hasRelease: skill.hasRelease ?? (skill.releaseCount ?? 0) > 0,
      platform: skill.platform ?? "generic",
      sources: skill.sources ?? [],
      primarySource: skill.primarySource ?? "github",
      id: skill.id ?? skill.repo,
    };
  });
}

export function getRelatedSkills(
  target: GithubSkillSnapshot,
  skills: GithubSkillSnapshot[],
  limit = 4,
) {
  const targetAudiences = inferAudiences(target);
  return skills
    .filter((skill) => skill.repo !== target.repo)
    .map((skill) => {
      const sharedTags = skill.tags.filter((tag) => target.tags.includes(tag));
      const sharedAudiences = inferAudiences(skill).filter((audience) =>
        targetAudiences.includes(audience),
      );
      const score =
        (skill.categoryCode === target.categoryCode ? 6 : 0) +
        sharedTags.length * 3 +
        sharedAudiences.length * 2 +
        Math.min(skill.stars / 250, 4) +
        Math.min(skill.chineseScore / 40, 2);
      return { skill, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || compareDefault(a.skill, b.skill))
    .slice(0, limit)
    .map((item) => item.skill);
}

export function deriveUseCases(skill: GithubSkillSnapshot): LocalizedText[] {
  if (skill.useCases?.length) return skill.useCases;
  const audiences = inferAudiences(skill);
  const useCases: LocalizedText[] = [];

  if (audiences.includes("media")) {
    useCases.push({
      zh: "适合自媒体创作者做选题、改写、素材整理和内容生产。",
      en: "Good for creators doing topics, rewriting, asset work, and production.",
    });
  }
  if (audiences.includes("developer")) {
    useCases.push({
      zh: "适合程序员把 SKILL.md 作为可复用开发工作流沉淀。",
      en: "Useful for developers turning SKILL.md into reusable workflows.",
    });
  }
  if (audiences.includes("writing")) {
    useCases.push({
      zh: "适合提示词、文章、报告和结构化写作流程。",
      en: "Useful for prompts, articles, reports, and structured writing.",
    });
  }
  if (audiences.includes("data")) {
    useCases.push({
      zh: "适合研究资料、搜索结果、数据洞察和报告生成。",
      en: "Useful for research materials, search results, data insights, and reports.",
    });
  }
  if (audiences.includes("productivity")) {
    useCases.push({
      zh: "适合文档处理、批量操作和日常办公提效。",
      en: "Useful for document handling, batch work, and office productivity.",
    });
  }

  return useCases.slice(0, 3);
}
