import { describe, expect, it } from "vitest";
import {
  calculateStats,
  filterAndSortRepositories,
  getFilterOptions,
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
    pushedAt: "2026-01-04T00:00:00Z",
    updatedAt: "2026-01-05T00:00:00Z",
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
        query: "workflow",
        category: "",
        platform: "",
        tag: "",
        license: "",
        language: "",
        sortKey: "stars",
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
    });
  });
});
