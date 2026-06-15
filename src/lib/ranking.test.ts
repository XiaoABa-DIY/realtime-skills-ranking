import { describe, expect, it } from "vitest";
import {
  calculateStats,
  defaultRepoFilters,
  enrichRepositories,
  filterAndSortRepositories,
  getRelatedRepositories,
  getFilterOptions,
  inferAudiences,
} from "./ranking";
import type { SkillRepoSnapshot } from "../types";

const repositories: SkillRepoSnapshot[] = [
  {
    repo: "alpha/agents",
    fullName: "alpha/agents",
    category: "Coding Agents",
    platforms: ["Agents"],
    tags: ["workflow", "python"],
    summary: { zh: "智能体工作流", en: "Agent workflows" },
    description: "Agent orchestration",
    stars: 20,
    forks: 4,
    openIssues: 2,
    watchers: 3,
    language: "Python",
    license: "MIT",
    homepage: "",
    htmlUrl: "https://github.com/alpha/agents",
    pushedAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-03T00:00:00Z",
    archived: false,
    disabled: false,
    fetchStatus: "ok",
    lastFetchedAt: "2026-01-04T00:00:00Z",
  },
  {
    repo: "beta/media",
    fullName: "beta/media",
    category: "Design & Media",
    platforms: ["Images"],
    tags: ["workflow", "nodes"],
    summary: { zh: "媒体工作流", en: "Media workflow" },
    description: "Image workflow",
    stars: 60,
    forks: 9,
    openIssues: 1,
    watchers: 5,
    language: "TypeScript",
    license: "Apache-2.0",
    homepage: "",
    htmlUrl: "https://github.com/beta/media",
    pushedAt: "2026-06-10T00:00:00Z",
    updatedAt: "2026-06-11T00:00:00Z",
    archived: false,
    disabled: false,
    fetchStatus: "ok",
    lastFetchedAt: "2026-01-06T00:00:00Z",
  },
];

describe("ranking helpers", () => {
  it("filters by query and category, then sorts by stars", () => {
    const result = filterAndSortRepositories(
      repositories,
      {
        ...defaultRepoFilters,
        query: "workflow",
      },
      "en",
    );

    expect(result.map((repo) => repo.repo)).toEqual([
      "beta/media",
      "alpha/agents",
    ]);
  });

  it("builds unique filter options", () => {
    expect(getFilterOptions(repositories)).toMatchObject({
      categories: ["Coding Agents", "Design & Media"],
      platforms: ["Agents", "Images"],
      licenses: ["Apache-2.0", "MIT"],
      languages: ["Python", "TypeScript"],
    });
  });

  it("calculates dashboard totals", () => {
    expect(calculateStats(repositories, "2026-01-01T00:00:00Z")).toMatchObject({
      totalRepos: 2,
      totalStars: 80,
      totalCategories: 2,
      activeCount: 2,
    });
  });

  it("filters by inferred audience and spotlight lists", () => {
    const developerRepos = filterAndSortRepositories(
      repositories,
      {
        ...defaultRepoFilters,
        audience: "developer",
      },
      "zh",
    );
    const creatorRepos = filterAndSortRepositories(
      repositories,
      {
        ...defaultRepoFilters,
        spotlight: "creatorPicks",
      },
      "zh",
    );

    expect(developerRepos.map((repo) => repo.repo)).toEqual(["alpha/agents"]);
    expect(creatorRepos.map((repo) => repo.repo)).toEqual(["beta/media"]);
  });

  it("filters to local favorites before sorting", () => {
    const result = filterAndSortRepositories(
      repositories,
      {
        ...defaultRepoFilters,
        query: "workflow",
        favoritesOnly: true,
      },
      "en",
      new Set(["alpha/agents"]),
    );

    expect(result.map((repo) => repo.repo)).toEqual(["alpha/agents"]);
  });

  it("sorts trend spotlights by star growth and rank movement", () => {
    const trendRepos: SkillRepoSnapshot[] = [
      {
        ...repositories[0],
        growth7d: 12,
        growth30d: 80,
        rankDelta7d: 4,
        rankDelta30d: 10,
        trendStatus: "ready",
      },
      {
        ...repositories[1],
        growth7d: 40,
        growth30d: 42,
        rankDelta7d: 1,
        rankDelta30d: 2,
        trendStatus: "ready",
      },
    ];

    expect(
      filterAndSortRepositories(
        trendRepos,
        { ...defaultRepoFilters, spotlight: "growth7d" },
        "en",
      ).map((repo) => repo.repo),
    ).toEqual(["beta/media", "alpha/agents"]);
    expect(
      filterAndSortRepositories(
        trendRepos,
        { ...defaultRepoFilters, spotlight: "growth30d" },
        "en",
      ).map((repo) => repo.repo),
    ).toEqual(["alpha/agents", "beta/media"]);
    expect(
      filterAndSortRepositories(
        trendRepos,
        { ...defaultRepoFilters, spotlight: "rankRisers" },
        "en",
      ).map((repo) => repo.repo),
    ).toEqual(["alpha/agents", "beta/media"]);
  });

  it("keeps trend spotlights useful while history is still collecting", () => {
    const collectingRepos: SkillRepoSnapshot[] = repositories.map((repo) => ({
      ...repo,
      growth7d: null,
      growth30d: null,
      rankDelta7d: null,
      rankDelta30d: null,
      trendStatus: "collecting",
    }));

    const result = filterAndSortRepositories(
      collectingRepos,
      { ...defaultRepoFilters, spotlight: "growth7d" },
      "en",
    );

    expect(result.map((repo) => repo.repo)).toEqual([
      "beta/media",
      "alpha/agents",
    ]);
  });

  it("derives ranks, freshness, audiences, and related repositories", () => {
    const enriched = enrichRepositories(repositories);
    const media = enriched.find((repo) => repo.repo === "beta/media")!;

    expect(media).toMatchObject({
      rank: 1,
      rankByCategory: 1,
      freshness: "fresh",
      qualitySignals: {
        hasLicense: true,
        recentlyPushed: true,
      },
    });
    expect(inferAudiences(media)).toContain("designMarketing");
    expect(getRelatedRepositories(media, enriched, 1)[0].repo).toBe(
      "alpha/agents",
    );
  });
});
