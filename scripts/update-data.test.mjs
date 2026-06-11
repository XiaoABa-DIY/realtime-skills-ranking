import { describe, expect, it } from "vitest";
import {
  buildCandidates,
  buildSnapshot,
  normalizeRepo,
  parseCompactNumber,
  parseGitHubRepoHtml,
} from "./update-data.mjs";

const curated = [
  {
    repo: "owner/good",
    category: "Coding Agents",
    platforms: ["Agents"],
    tags: ["workflow"],
    summary: { zh: "Good repo zh", en: "Good repo" },
    featured: true,
  },
  {
    repo: "owner/missing",
    category: "MCP & Tooling",
    platforms: ["MCP"],
    tags: ["tools"],
    summary: { zh: "Missing repo zh", en: "Missing repo" },
    featured: false,
  },
];

describe("update-data script helpers", () => {
  it("normalizes GitHub repository strings", () => {
    expect(normalizeRepo(" https://github.com/Owner/Repo/ ")).toBe(
      "Owner/Repo",
    );
  });

  it("parses compact GitHub numbers and repository HTML", () => {
    expect(parseCompactNumber("13.9k")).toBe(13900);
    expect(parseCompactNumber("2m")).toBe(2000000);
    expect(
      parseGitHubRepoHtml(
        "owner/repo",
        '<a href="/owner/repo/stargazers"><strong>13.9k</strong> stars</a><a href="/owner/repo/forks"><strong>2.1k</strong> forks</a><meta name="description" content="Useful &amp; focused">',
      ),
    ).toMatchObject({
      stars: 13900,
      forks: 2100,
      description: "Useful & focused",
    });
  });

  it("builds snapshots and marks failed repositories without aborting", async () => {
    const fetcher = async (url) => {
      if (url.endsWith("/owner/missing")) {
        const error = new Error("GitHub API 404: Not Found");
        error.status = 404;
        throw error;
      }

      return {
        full_name: "owner/good",
        description: "A useful skill repo",
        stargazers_count: 42,
        forks_count: 7,
        open_issues_count: 3,
        subscribers_count: 4,
        language: "TypeScript",
        license: { spdx_id: "MIT" },
        homepage: "https://example.com",
        html_url: "https://github.com/owner/good",
        pushed_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        archived: false,
        disabled: false,
      };
    };

    const snapshot = await buildSnapshot(curated, fetcher);

    expect(snapshot.repositories).toHaveLength(2);
    expect(snapshot.repositories[0]).toMatchObject({
      repo: "owner/good",
      stars: 42,
      fetchStatus: "ok",
    });
    expect(snapshot.repositories[1]).toMatchObject({
      repo: "owner/missing",
      stars: 0,
      fetchStatus: "error",
    });
  });

  it("preserves previous metrics when repository refresh fails", async () => {
    const fetcher = async () => {
      throw new Error("GitHub API 403: rate limited");
    };

    const snapshot = await buildSnapshot([curated[0]], fetcher, {
      previousRepositories: [
        {
          ...curated[0],
          fullName: "owner/good",
          description: "Previous data",
          stars: 88,
          forks: 9,
          openIssues: 1,
          watchers: 2,
          language: "TypeScript",
          license: "MIT",
          htmlUrl: "https://github.com/owner/good",
          pushedAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
          archived: false,
          disabled: false,
          fetchStatus: "ok",
          lastFetchedAt: "2026-01-01T00:00:00Z",
        },
      ],
    });

    expect(snapshot.repositories[0]).toMatchObject({
      repo: "owner/good",
      stars: 88,
      fetchStatus: "ok",
    });
  });

  it("deduplicates and excludes curated repositories from candidates", async () => {
    const queries = [
      {
        id: "agents",
        query: "ai agent",
        category: "Coding Agents",
        limit: 10,
        reason: { zh: "Candidate zh", en: "Candidate" },
      },
    ];
    const fetcher = async () => ({
      items: [
        {
          full_name: "owner/good",
          description: "Already curated",
          stargazers_count: 100,
          forks_count: 10,
          language: "TypeScript",
          license: { spdx_id: "MIT" },
          html_url: "https://github.com/owner/good",
          pushed_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
        {
          full_name: "new/skill",
          description: "New candidate",
          stargazers_count: 12,
          forks_count: 2,
          language: "Python",
          license: { spdx_id: "Apache-2.0" },
          html_url: "https://github.com/new/skill",
          pushed_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
        {
          full_name: "new/skill",
          description: "Duplicate candidate",
          stargazers_count: 12,
          forks_count: 2,
          language: "Python",
          license: { spdx_id: "Apache-2.0" },
          html_url: "https://github.com/new/skill",
          pushed_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
      ],
    });

    const result = await buildCandidates(queries, curated, fetcher);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      repo: "new/skill",
      alreadyCurated: false,
      matchedQuery: "agents",
    });
  });
});
