import { describe, expect, it } from "vitest";
import {
  calculateStats,
  defaultSkillFilters,
  enrichSkills,
  filterAndSortSkills,
  getFilterOptions,
  getRelatedSkills,
  inferAudiences,
} from "./ranking";
import type { RedfoxSkillSnapshot } from "../types";

function makeSkill(
  overrides: Partial<RedfoxSkillSnapshot>,
): RedfoxSkillSnapshot {
  return {
    skillNo: overrides.skillNo ?? overrides.skillCode ?? "skill-no",
    skillCode: overrides.skillCode ?? "skill-code",
    name: overrides.name ?? { zh: "技能", en: "Skill" },
    description: overrides.description ?? { zh: "", en: "" },
    introduce: overrides.introduce ?? { zh: "", en: "" },
    readme: overrides.readme ?? { zh: "", en: "" },
    categoryCode: overrides.categoryCode ?? "data_query",
    categoryName: overrides.categoryName ?? {
      zh: "数据查询",
      en: "Data Query",
    },
    categories: overrides.categories ?? [],
    tags: overrides.tags ?? [],
    icon: "",
    iconUrl: "",
    price: 0,
    usageCount: 0,
    viewCount: overrides.viewCount ?? 0,
    downloadCount: overrides.downloadCount ?? 0,
    displayStatus: overrides.displayStatus ?? 0,
    displayBadge: overrides.displayBadge ?? null,
    status: 1,
    hasApiKey: overrides.hasApiKey ?? false,
    platformInfoRaw: "",
    accessMethods: overrides.accessMethods ?? [],
    redfoxUrl: `https://redfox.hk/skills/no/${overrides.skillNo ?? "skill-no"}`,
    githubUrl: "",
    githubPath: "",
    heatScore: overrides.heatScore ?? 0,
    rank: overrides.rank ?? 0,
    rankByCategory: overrides.rankByCategory ?? 0,
    createdAt: overrides.createdAt ?? "2026-06-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-02T00:00:00.000Z",
    lastFetchedAt: "2026-06-03T00:00:00.000Z",
    fetchStatus: "ok",
    downloadGrowth7d: overrides.downloadGrowth7d ?? null,
    downloadGrowth30d: overrides.downloadGrowth30d ?? null,
    rankDelta7d: overrides.rankDelta7d ?? null,
    rankDelta30d: overrides.rankDelta30d ?? null,
    trendStatus: overrides.trendStatus ?? "collecting",
    audiences: overrides.audiences ?? [],
    useCases: overrides.useCases ?? [],
  };
}

const skills: RedfoxSkillSnapshot[] = [
  makeSkill({
    skillCode: "douyin-search",
    name: { zh: "抖音作品查询", en: "Douyin Search" },
    introduce: { zh: "查询抖音作品数据", en: "Search Douyin work data" },
    categoryCode: "data_query",
    tags: ["抖音", "数据查询"],
    viewCount: 400,
    downloadCount: 300,
    heatScore: 900,
    updatedAt: "2026-06-11T00:00:00.000Z",
  }),
  makeSkill({
    skillCode: "multi-wordcheck",
    name: { zh: "多平台违禁词检测", en: "Word Check" },
    introduce: { zh: "公众号小红书抖音违禁词检测", en: "Compliance checks" },
    categoryCode: "efficiency_tools",
    categoryName: { zh: "效率工具", en: "Efficiency Tools" },
    tags: ["合规审核", "内容改写"],
    viewCount: 1000,
    downloadCount: 500,
    heatScore: 1000,
    updatedAt: "2026-06-10T00:00:00.000Z",
  }),
];

describe("ranking helpers", () => {
  it("filters by query and category, then sorts by heat score", () => {
    const result = filterAndSortSkills(
      skills,
      {
        ...defaultSkillFilters,
        query: "抖音",
      },
      "zh",
    );

    expect(result.map((skill) => skill.skillCode)).toEqual([
      "multi-wordcheck",
      "douyin-search",
    ]);
  });

  it("builds unique filter options", () => {
    expect(getFilterOptions(skills)).toMatchObject({
      categories: ["data_query", "efficiency_tools"],
      tags: ["抖音", "合规审核", "内容改写", "数据查询"],
    });
  });

  it("calculates dashboard totals", () => {
    expect(calculateStats(skills, "2026-06-01T00:00:00Z")).toMatchObject({
      totalSkills: 2,
      totalDownloads: 800,
      totalViews: 1400,
      totalCategories: 2,
    });
  });

  it("filters by inferred audience and spotlight lists", () => {
    const douyinSkills = filterAndSortSkills(
      skills,
      { ...defaultSkillFilters, audience: "douyin" },
      "zh",
    );
    const toolSkills = filterAndSortSkills(
      skills,
      { ...defaultSkillFilters, audience: "productivity" },
      "zh",
    );

    expect(douyinSkills.map((skill) => skill.skillCode)).toEqual([
      "multi-wordcheck",
      "douyin-search",
    ]);
    expect(toolSkills.map((skill) => skill.skillCode)).toEqual([
      "multi-wordcheck",
    ]);
  });

  it("filters to local favorites before sorting", () => {
    const result = filterAndSortSkills(
      skills,
      {
        ...defaultSkillFilters,
        query: "抖音",
        favoritesOnly: true,
      },
      "zh",
      new Set(["douyin-search"]),
    );

    expect(result.map((skill) => skill.skillCode)).toEqual(["douyin-search"]);
  });

  it("sorts trend spotlights by usage growth and rank movement", () => {
    const trendSkills = [
      makeSkill({
        skillCode: "a",
        heatScore: 20,
        downloadGrowth7d: 12,
        downloadGrowth30d: 80,
        rankDelta7d: 4,
        rankDelta30d: 10,
        trendStatus: "ready",
      }),
      makeSkill({
        skillCode: "b",
        heatScore: 40,
        downloadGrowth7d: 40,
        downloadGrowth30d: 42,
        rankDelta7d: 1,
        rankDelta30d: 2,
        trendStatus: "ready",
      }),
    ];

    expect(
      filterAndSortSkills(
        trendSkills,
        { ...defaultSkillFilters, spotlight: "growth7d" },
        "en",
      ).map((skill) => skill.skillCode),
    ).toEqual(["b", "a"]);
    expect(
      filterAndSortSkills(
        trendSkills,
        { ...defaultSkillFilters, spotlight: "growth30d" },
        "en",
      ).map((skill) => skill.skillCode),
    ).toEqual(["a", "b"]);
    expect(
      filterAndSortSkills(
        trendSkills,
        { ...defaultSkillFilters, spotlight: "rankRisers" },
        "en",
      ).map((skill) => skill.skillCode),
    ).toEqual(["a", "b"]);
  });

  it("derives ranks, audiences, and related skills", () => {
    const enriched = enrichSkills(skills);
    const wordcheck = enriched.find(
      (skill) => skill.skillCode === "multi-wordcheck",
    )!;

    expect(wordcheck).toMatchObject({
      rank: 1,
      rankByCategory: 1,
    });
    expect(inferAudiences(wordcheck)).toContain("douyin");
    expect(getRelatedSkills(wordcheck, enriched, 1)[0].skillCode).toBe(
      "douyin-search",
    );
  });
});
