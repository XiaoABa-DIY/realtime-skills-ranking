import { describe, expect, it } from "vitest";
import {
  calculateStats,
  calculateSkillQualityScore,
  defaultSkillFilters,
  enrichSkills,
  filterAndSortSkills,
  getFilterOptions,
  getRelatedSkills,
  inferAudiences,
} from "./ranking";
import type { GithubSkillSnapshot } from "../types";

function makeSkill(
  overrides: Partial<GithubSkillSnapshot>,
): GithubSkillSnapshot {
  return {
    repo: overrides.repo ?? "owner/skill",
    name: overrides.name ?? "Skill",
    descriptionZh: overrides.descriptionZh ?? "中文 Skill",
    descriptionEn: overrides.descriptionEn ?? "Chinese skill",
    readmeSnippetZh: overrides.readmeSnippetZh ?? "",
    readmeSnippetEn: overrides.readmeSnippetEn ?? "",
    categoryCode: overrides.categoryCode ?? "content",
    categoryName: overrides.categoryName ?? {
      zh: "内容创作",
      en: "Content Creation",
    },
    tags: overrides.tags ?? [],
    audiences: overrides.audiences ?? [],
    useCases: overrides.useCases ?? [],
    skillMdPaths: overrides.skillMdPaths ?? ["skills/demo/SKILL.md"],
    stars: overrides.stars ?? 0,
    forks: overrides.forks ?? 0,
    openIssues: overrides.openIssues ?? 0,
    watchers: overrides.watchers ?? overrides.stars ?? 0,
    language: overrides.language ?? "Markdown",
    license: overrides.license ?? "MIT",
    topics: overrides.topics ?? [],
    homepage: overrides.homepage ?? "",
    htmlUrl:
      overrides.htmlUrl ??
      `https://github.com/${overrides.repo ?? "owner/skill"}`,
    createdAt: overrides.createdAt ?? "2026-06-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-06-02T00:00:00.000Z",
    pushedAt: overrides.pushedAt ?? "2026-06-02T00:00:00.000Z",
    lastFetchedAt: "2026-06-03T00:00:00.000Z",
    fetchStatus: overrides.fetchStatus ?? "ok",
    rank: overrides.rank ?? 0,
    rankByCategory: overrides.rankByCategory ?? 0,
    growth7d: overrides.growth7d ?? null,
    growth30d: overrides.growth30d ?? null,
    rankDelta7d: overrides.rankDelta7d ?? null,
    rankDelta30d: overrides.rankDelta30d ?? null,
    trendStatus: overrides.trendStatus ?? "collecting",
    chineseScore: overrides.chineseScore ?? 50,
    skillSignalScore: overrides.skillSignalScore ?? 100,
    featured: overrides.featured ?? false,
    ecosystems: overrides.ecosystems ?? [{ ecosystem: "universal", compatible: true, verified: false, badge: "Universal" }],
    hnMetric: overrides.hnMetric,
    productHuntVotes: overrides.productHuntVotes,
    relatedMCPs: overrides.relatedMCPs ?? [],
    popularityScore: overrides.popularityScore ?? 50,
    activityScore: overrides.activityScore ?? 30,
    adoptionScore: overrides.adoptionScore ?? 40,
    officialScore: overrides.officialScore ?? 20,
    ecosystemScore: overrides.ecosystemScore ?? 15,
    compositeScore: overrides.compositeScore ?? 35,
    releaseCount: overrides.releaseCount ?? 0,
    latestRelease: overrides.latestRelease,
    weeklyCommits: overrides.weeklyCommits ?? 0,
    contributors: overrides.contributors ?? 0,
  };
}

const skills: GithubSkillSnapshot[] = [
  makeSkill({
    repo: "owner/content-skill",
    name: "content-skill",
    descriptionZh: "公众号、小红书和长文写作 Skill",
    categoryCode: "content",
    tags: ["写作", "中文"],
    stars: 900,
    forks: 88,
    audiences: ["media", "writing"],
    featured: true,
  }),
  makeSkill({
    repo: "owner/research-skill",
    name: "research-skill",
    descriptionZh: "资料研究、结构化报告和数据分析 Skill",
    categoryCode: "data",
    categoryName: { zh: "数据研究", en: "Data Research" },
    tags: ["研究", "数据"],
    stars: 300,
    forks: 21,
    audiences: ["data"],
  }),
];

describe("ranking helpers", () => {
  it("filters by query and category, then sorts by GitHub stars", () => {
    const result = filterAndSortSkills(
      skills,
      {
        ...defaultSkillFilters,
        query: "skill",
      },
      "zh",
    );

    expect(result.map((skill) => skill.repo)).toEqual([
      "owner/content-skill",
      "owner/research-skill",
    ]);
  });

  it("builds unique filter options", () => {
    expect(getFilterOptions(skills)).toMatchObject({
      categories: ["content", "data"],
      tags: ["中文", "写作", "数据", "研究"],
    });
  });

  it("calculates GitHub dashboard totals", () => {
    expect(calculateStats(skills, "2026-06-01T00:00:00Z")).toMatchObject({
      totalSkills: 2,
      totalStars: 1200,
      totalForks: 109,
      chineseFriendly: 2,
    });
  });

  it("filters by inferred audience, featured spotlight, and favorites", () => {
    const mediaSkills = filterAndSortSkills(
      skills,
      { ...defaultSkillFilters, audience: "media" },
      "zh",
    );
    const featuredSkills = filterAndSortSkills(
      skills,
      { ...defaultSkillFilters, spotlight: "featured" },
      "zh",
    );
    const favoriteSkills = filterAndSortSkills(
      skills,
      {
        ...defaultSkillFilters,
        favoritesOnly: true,
      },
      "zh",
      new Set(["owner/research-skill"]),
    );

    expect(mediaSkills.map((skill) => skill.repo)).toEqual([
      "owner/content-skill",
    ]);
    expect(featuredSkills.map((skill) => skill.repo)).toEqual([
      "owner/content-skill",
    ]);
    expect(favoriteSkills.map((skill) => skill.repo)).toEqual([
      "owner/research-skill",
    ]);
  });

  it("sorts trend spotlights by star growth and rank movement", () => {
    const trendSkills = [
      makeSkill({
        repo: "owner/a",
        stars: 20,
        growth7d: 12,
        growth30d: 80,
        rankDelta7d: 4,
        rankDelta30d: 10,
        trendStatus: "ready",
      }),
      makeSkill({
        repo: "owner/b",
        stars: 40,
        growth7d: 40,
        growth30d: 42,
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
      ).map((skill) => skill.repo),
    ).toEqual(["owner/b", "owner/a"]);
    expect(
      filterAndSortSkills(
        trendSkills,
        { ...defaultSkillFilters, spotlight: "growth30d" },
        "en",
      ).map((skill) => skill.repo),
    ).toEqual(["owner/a", "owner/b"]);
    expect(
      filterAndSortSkills(
        trendSkills,
        { ...defaultSkillFilters, spotlight: "rankRisers" },
        "en",
      ).map((skill) => skill.repo),
    ).toEqual(["owner/a", "owner/b"]);
  });

  it("derives ranks, audiences, and related skills", () => {
    const enriched = enrichSkills(skills);
    const content = enriched.find(
      (skill) => skill.repo === "owner/content-skill",
    )!;

    expect(content).toMatchObject({
      rank: 1,
      rankByCategory: 1,
    });
    expect(inferAudiences(content)).toContain("media");
    expect(getRelatedSkills(content, enriched, 1)[0].repo).toBe(
      "owner/research-skill",
    );
  });

  it("calculates a bounded quality score from completeness, docs, freshness, heat, Chinese friendliness, and license", () => {
    const strong = makeSkill({
      stars: 1200,
      forks: 120,
      chineseScore: 90,
      skillSignalScore: 100,
      license: "MIT",
      pushedAt: "2026-06-01T00:00:00.000Z",
      readmeSnippetZh: "中文说明".repeat(180),
      readmeSnippetEn: "English docs ".repeat(80),
    });
    const weak = makeSkill({
      stars: 5,
      forks: 0,
      chineseScore: 10,
      skillSignalScore: 30,
      license: "",
      pushedAt: "2025-01-01T00:00:00.000Z",
      readmeSnippetZh: "",
      readmeSnippetEn: "",
    });

    expect(
      calculateSkillQualityScore(strong, Date.parse("2026-06-16T00:00:00Z")),
    ).toBeGreaterThan(80);
    expect(
      calculateSkillQualityScore(weak, Date.parse("2026-06-16T00:00:00Z")),
    ).toBeLessThan(35);
  });
});
