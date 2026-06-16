import type {
  AudienceKey,
  Locale,
  LocalizedText,
  RedfoxSkillSnapshot,
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
  sortKey: "heat",
  audience: "",
  spotlight: "",
  favoritesOnly: false,
};

export const audienceKeys: AudienceKey[] = [
  "media",
  "wechat",
  "xiaohongshu",
  "douyin",
  "data",
  "productivity",
  "developer",
];

export const spotlightKeys: SpotlightKey[] = [
  "hot",
  "recommended",
  "new",
  "topUses",
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
      zh: "选题、改写、素材处理和跨平台内容生产。",
      en: "Topics, rewriting, asset work, and cross-platform publishing.",
    },
    matchers: ["自媒体", "创作", "内容", "文案", "rewrite", "creator"],
  },
  wechat: {
    key: "wechat",
    label: { zh: "公众号运营", en: "WeChat operators" },
    description: {
      zh: "公众号选题、爆文分析、订阅监控和推文生产。",
      en: "WeChat article ideas, analysis, monitoring, and publishing.",
    },
    matchers: ["公众号", "gzh", "wechat"],
  },
  xiaohongshu: {
    key: "xiaohongshu",
    label: { zh: "小红书创作者", en: "Xiaohongshu creators" },
    description: {
      zh: "笔记选题、账号诊断、文案改写和趋势跟踪。",
      en: "RED notes, account diagnosis, copy rewriting, and trend tracking.",
    },
    matchers: ["小红书", "xiaohongshu", "xhs", "red"],
  },
  douyin: {
    key: "douyin",
    label: { zh: "抖音运营", en: "Douyin operators" },
    description: {
      zh: "抖音搜索、榜单、账号分析和视频内容复盘。",
      en: "Douyin search, rankings, account analysis, and video review.",
    },
    matchers: ["抖音", "douyin", "tiktok"],
  },
  data: {
    key: "data",
    label: { zh: "数据分析", en: "Data analysts" },
    description: {
      zh: "榜单、搜索、采集、趋势和账号数据洞察。",
      en: "Rankings, search, crawling, trends, and account insights.",
    },
    matchers: ["数据", "榜单", "查询", "分析", "搜索", "ranking", "search"],
  },
  productivity: {
    key: "productivity",
    label: { zh: "效率工具", en: "Productivity" },
    description: {
      zh: "提取、检测、下载、改写和批处理工具。",
      en: "Extraction, checking, downloading, rewriting, and batch work.",
    },
    matchers: ["效率", "工具", "检测", "提取", "下载", "pdf", "tool"],
  },
  developer: {
    key: "developer",
    label: { zh: "Agent/开发者", en: "Agent builders" },
    description: {
      zh: "适合用 SKILL.md、CLI、API Key 和开源源码扩展 Agent。",
      en: "SKILL.md, CLI, API-key, and open-source agent extension users.",
    },
    matchers: ["skill", "api", "github", "cli", "agent", "开发"],
  },
};

export const spotlightViews: Record<SpotlightKey, SpotlightView> = {
  hot: {
    key: "hot",
    label: { zh: "热门", en: "Hot" },
    description: {
      zh: "RedFox 标记为热门或综合热度靠前的 skills。",
      en: "Skills marked hot by RedFox or ranking high by heat score.",
    },
  },
  recommended: {
    key: "recommended",
    label: { zh: "推荐", en: "Recommended" },
    description: {
      zh: "RedFox 推荐技能，适合直接试用。",
      en: "RedFox recommended skills worth trying first.",
    },
  },
  new: {
    key: "new",
    label: { zh: "上新", en: "New" },
    description: {
      zh: "新发布或最近更新的 skills。",
      en: "Newly published or recently updated skills.",
    },
  },
  topUses: {
    key: "topUses",
    label: { zh: "使用量榜", en: "Most used" },
    description: {
      zh: "按 RedFox 页面展示的使用量排序。",
      en: "Sorted by the usage count displayed on RedFox.",
    },
  },
  recentlyUpdated: {
    key: "recentlyUpdated",
    label: { zh: "最近更新", en: "Recently updated" },
    description: {
      zh: "优先看最近维护的 skills。",
      en: "Skills with the freshest update time.",
    },
  },
  growth7d: {
    key: "growth7d",
    label: { zh: "7 天使用增长", en: "7-day usage growth" },
    description: {
      zh: "历史足够时按 7 天新增使用量排序。",
      en: "Ranks by 7-day usage growth once history is available.",
    },
  },
  growth30d: {
    key: "growth30d",
    label: { zh: "30 天使用增长", en: "30-day usage growth" },
    description: {
      zh: "历史足够时按 30 天新增使用量排序。",
      en: "Ranks by 30-day usage growth once history is available.",
    },
  },
  rankRisers: {
    key: "rankRisers",
    label: { zh: "排名上升最快", en: "Fastest risers" },
    description: {
      zh: "按 7 天排名变化排序，历史不足时回退综合热度。",
      en: "Sorts by 7-day rank movement, falling back to heat score.",
    },
  },
};

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  );
}

export function getFilterOptions(skills: RedfoxSkillSnapshot[]) {
  return {
    categories: uniqueSorted(skills.map((skill) => skill.categoryCode)),
    tags: uniqueSorted(skills.flatMap((skill) => skill.tags)),
  };
}

function skillText(skill: RedfoxSkillSnapshot, locale: Locale) {
  return [
    skill.skillCode,
    skill.skillNo,
    skill.name.zh,
    skill.name.en,
    skill.name[locale],
    skill.categoryCode,
    skill.categoryName.zh,
    skill.categoryName.en,
    skill.description.zh,
    skill.description.en,
    skill.introduce.zh,
    skill.introduce.en,
    skill.displayBadge?.zh ?? "",
    skill.displayBadge?.en ?? "",
    ...(skill.audiences ?? []),
    ...(skill.useCases ?? []).flatMap((item) => [item.zh, item.en]),
    ...skill.tags,
    ...skill.accessMethods.flatMap((method) => [method.name, method.value]),
  ]
    .join(" ")
    .toLowerCase();
}

function matcherText(skill: RedfoxSkillSnapshot) {
  return [
    skill.skillCode,
    skill.name.zh,
    skill.name.en,
    skill.categoryCode,
    skill.categoryName.zh,
    skill.categoryName.en,
    skill.description.zh,
    skill.introduce.zh,
    ...skill.tags,
    ...skill.accessMethods.map((method) => method.name),
  ]
    .join(" ")
    .toLowerCase();
}

export function inferAudiences(skill: RedfoxSkillSnapshot): AudienceKey[] {
  if (skill.audiences?.length) return skill.audiences;

  const text = matcherText(skill);
  const inferred = audienceKeys.filter((audience) =>
    audienceProfiles[audience].matchers.some((matcher) =>
      text.includes(matcher.toLowerCase()),
    ),
  );

  return inferred.length ? inferred : ["media"];
}

export function matchesAudience(
  skill: RedfoxSkillSnapshot,
  audience: AudienceKey,
) {
  return inferAudiences(skill).includes(audience);
}

function matchesSpotlight(skill: RedfoxSkillSnapshot, spotlight: SpotlightKey) {
  if (
    spotlight === "growth7d" ||
    spotlight === "growth30d" ||
    spotlight === "rankRisers" ||
    spotlight === "topUses" ||
    spotlight === "recentlyUpdated"
  ) {
    return true;
  }
  if (spotlight === "hot") return skill.displayStatus === 1;
  if (spotlight === "recommended") return skill.displayStatus === 2;
  return skill.displayStatus === 3;
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

function compareByUpdated(a: RedfoxSkillSnapshot, b: RedfoxSkillSnapshot) {
  return Date.parse(b.updatedAt || "0") - Date.parse(a.updatedAt || "0");
}

function compareByCreated(a: RedfoxSkillSnapshot, b: RedfoxSkillSnapshot) {
  return Date.parse(b.createdAt || "0") - Date.parse(a.createdAt || "0");
}

function compareDefault(a: RedfoxSkillSnapshot, b: RedfoxSkillSnapshot) {
  return (
    b.heatScore - a.heatScore ||
    b.downloadCount - a.downloadCount ||
    compareByUpdated(a, b) ||
    a.skillCode.localeCompare(b.skillCode)
  );
}

function compareTrendSpotlight(
  a: RedfoxSkillSnapshot,
  b: RedfoxSkillSnapshot,
  spotlight: SpotlightKey,
) {
  if (spotlight === "growth7d") {
    return (
      compareNullableDesc(a.downloadGrowth7d, b.downloadGrowth7d) ||
      compareNullableDesc(a.rankDelta7d, b.rankDelta7d)
    );
  }
  if (spotlight === "growth30d") {
    return (
      compareNullableDesc(a.downloadGrowth30d, b.downloadGrowth30d) ||
      compareNullableDesc(a.rankDelta30d, b.rankDelta30d)
    );
  }
  if (spotlight === "rankRisers") {
    return (
      compareNullableDesc(a.rankDelta7d, b.rankDelta7d) ||
      compareNullableDesc(a.downloadGrowth7d, b.downloadGrowth7d)
    );
  }
  return 0;
}

export function filterAndSortSkills(
  skills: RedfoxSkillSnapshot[],
  filters: SkillFilters,
  locale: Locale,
  favoriteSkills: ReadonlySet<string> = new Set(),
) {
  const query = filters.query.trim().toLowerCase();

  return skills
    .filter((skill) => {
      if (
        filters.favoritesOnly &&
        !favoriteSkills.has(skill.skillCode.toLowerCase())
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
        if (filters.spotlight === "topUses") {
          return b.downloadCount - a.downloadCount || compareDefault(a, b);
        }
        if (filters.spotlight === "recentlyUpdated") {
          return compareByUpdated(a, b) || compareDefault(a, b);
        }
        if (filters.spotlight === "new") {
          return compareByCreated(a, b) || compareByUpdated(a, b);
        }
        return compareDefault(a, b);
      }

      if (filters.sortKey === "uses") {
        return b.downloadCount - a.downloadCount || compareDefault(a, b);
      }
      if (filters.sortKey === "views") {
        return b.viewCount - a.viewCount || compareDefault(a, b);
      }
      if (filters.sortKey === "updated") {
        return compareByUpdated(a, b) || compareDefault(a, b);
      }
      if (filters.sortKey === "name") {
        return skillName(a, locale).localeCompare(
          skillName(b, locale),
          "zh-CN",
        );
      }
      return compareDefault(a, b);
    });
}

export function skillName(skill: RedfoxSkillSnapshot, locale: Locale) {
  return skill.name[locale] || skill.name.zh || skill.skillCode;
}

export function skillSummary(skill: RedfoxSkillSnapshot, locale: Locale) {
  return (
    skill.introduce[locale] ||
    skill.description[locale] ||
    skill.description.zh ||
    skill.skillCode
  );
}

export function calculateStats(
  skills: RedfoxSkillSnapshot[],
  generatedAt: string,
) {
  return {
    totalSkills: skills.length,
    totalDownloads: skills.reduce((sum, skill) => sum + skill.downloadCount, 0),
    totalViews: skills.reduce((sum, skill) => sum + skill.viewCount, 0),
    totalCategories: new Set(skills.map((skill) => skill.categoryCode)).size,
    apiKeySkills: skills.filter((skill) => skill.hasApiKey).length,
    generatedAt,
  };
}

export function enrichSkills(skills: RedfoxSkillSnapshot[]) {
  const globalRanks = new Map(
    [...skills]
      .sort(compareDefault)
      .map((skill, index) => [skill.skillCode, index + 1]),
  );
  const categoryRanks = new Map<string, number>();

  for (const category of uniqueSorted(
    skills.map((skill) => skill.categoryCode),
  )) {
    [...skills]
      .filter((skill) => skill.categoryCode === category)
      .sort(compareDefault)
      .forEach((skill, index) => {
        categoryRanks.set(skill.skillCode, index + 1);
      });
  }

  return skills.map((skill) => ({
    ...skill,
    rank: globalRanks.get(skill.skillCode) ?? skill.rank,
    rankByCategory: categoryRanks.get(skill.skillCode) ?? skill.rankByCategory,
    audiences: inferAudiences(skill),
    downloadGrowth7d: skill.downloadGrowth7d ?? null,
    downloadGrowth30d: skill.downloadGrowth30d ?? null,
    rankDelta7d: skill.rankDelta7d ?? null,
    rankDelta30d: skill.rankDelta30d ?? null,
    trendStatus:
      skill.trendStatus ??
      (skill.downloadGrowth7d === null ||
      skill.downloadGrowth7d === undefined ||
      skill.downloadGrowth30d === null ||
      skill.downloadGrowth30d === undefined
        ? "collecting"
        : "ready"),
  }));
}

export function getRelatedSkills(
  target: RedfoxSkillSnapshot,
  skills: RedfoxSkillSnapshot[],
  limit = 4,
) {
  const targetAudiences = inferAudiences(target);
  return skills
    .filter((skill) => skill.skillCode !== target.skillCode)
    .map((skill) => {
      const sharedTags = skill.tags.filter((tag) => target.tags.includes(tag));
      const sharedAudiences = inferAudiences(skill).filter((audience) =>
        targetAudiences.includes(audience),
      );
      const score =
        (skill.categoryCode === target.categoryCode ? 6 : 0) +
        sharedTags.length * 3 +
        sharedAudiences.length * 2 +
        Math.min(skill.heatScore / 250, 4);
      return { skill, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || compareDefault(a.skill, b.skill))
    .slice(0, limit)
    .map((item) => item.skill);
}

export function deriveUseCases(skill: RedfoxSkillSnapshot): LocalizedText[] {
  if (skill.useCases?.length) return skill.useCases;
  const audiences = inferAudiences(skill);
  const useCases: LocalizedText[] = [];

  if (audiences.includes("media")) {
    useCases.push({
      zh: "适合自媒体创作者做选题、改写、检测和内容生产。",
      en: "Good for creators doing topic work, rewriting, checks, and production.",
    });
  }
  if (audiences.includes("wechat")) {
    useCases.push({
      zh: "适合公众号运营做爆文分析、订阅监控和推文生产。",
      en: "Useful for WeChat article analysis, monitoring, and publishing.",
    });
  }
  if (audiences.includes("xiaohongshu")) {
    useCases.push({
      zh: "适合小红书笔记、账号诊断和种草文案优化。",
      en: "Useful for RED notes, account diagnosis, and copy optimization.",
    });
  }
  if (audiences.includes("douyin")) {
    useCases.push({
      zh: "适合抖音热点、账号、视频作品和搜索数据分析。",
      en: "Useful for Douyin trends, accounts, videos, and search analysis.",
    });
  }
  if (audiences.includes("data")) {
    useCases.push({
      zh: "适合研究热榜、搜索结果、账号数据和内容趋势。",
      en: "Useful for rankings, search results, account data, and content trends.",
    });
  }
  if (audiences.includes("developer")) {
    useCases.push({
      zh: "适合 Agent/CLI 用户直接复用 SKILL.md 与脚本能力。",
      en: "Useful for Agent and CLI users reusing SKILL.md and scripts.",
    });
  }

  return useCases.slice(0, 3);
}
