import { describe, expect, it } from "vitest";
import {
  addTrendMetricsToSnapshot,
  buildCandidates,
  buildSnapshot,
  createHistoryFromSnapshot,
  mergeHistoryPayloads,
  mergeSnapshotIntoHistory,
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
        pushed_at: "2026-06-10T00:00:00Z",
        updated_at: "2026-06-11T00:00:00Z",
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
      audiences: ["developer"],
      rank: 1,
      rankByCategory: 1,
      freshness: "fresh",
      qualitySignals: {
        hasLicense: true,
        hasHomepage: true,
        recentlyPushed: true,
      },
    });
    expect(snapshot.repositories[1]).toMatchObject({
      repo: "owner/missing",
      stars: 0,
      fetchStatus: "error",
      rank: 2,
      rankByCategory: 1,
      freshness: "unknown",
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
      suggestedCategory: "Coding Agents",
      suggestedAudiences: ["developer"],
    });
    expect(result.candidates[0].confidence).toBeGreaterThanOrEqual(42);
  });

  it("skips failed discovery queries without creating placeholder candidates", async () => {
    const queries = [
      {
        id: "rate-limited",
        query: "ai tools",
        category: "Developer Tools",
        limit: 10,
        reason: { zh: "Candidate zh", en: "Candidate" },
      },
    ];
    const fetcher = async () => {
      throw new Error("GitHub API 403: rate limited");
    };

    const result = await buildCandidates(queries, curated, fetcher);

    expect(result.candidates).toEqual([]);
  });

  it("seeds repository history from an existing snapshot when no history exists", () => {
    const history = createHistoryFromSnapshot({
      generatedAt: "2026-06-01T12:00:00.000Z",
      repositories: [
        {
          repo: "owner/good",
          stars: 10,
          forks: 2,
          rank: 3,
          rankByCategory: 1,
        },
      ],
    });

    expect(history).toMatchObject({
      retentionDays: 180,
      repositories: [
        {
          repo: "owner/good",
          samples: [
            {
              date: "2026-06-01",
              stars: 10,
              forks: 2,
              rank: 3,
              rankByCategory: 1,
            },
          ],
        },
      ],
    });
  });

  it("merges one UTC sample per day and overwrites repeated daily refreshes", () => {
    const history = {
      generatedAt: "2026-06-15T00:00:00.000Z",
      retentionDays: 180,
      repositories: [
        {
          repo: "owner/good",
          samples: [
            {
              date: "2026-06-15",
              stars: 10,
              forks: 2,
              rank: 3,
              rankByCategory: 1,
            },
          ],
        },
      ],
    };
    const snapshot = {
      generatedAt: "2026-06-15T12:00:00.000Z",
      repositories: [
        {
          repo: "owner/good",
          stars: 14,
          forks: 3,
          rank: 2,
          rankByCategory: 1,
        },
      ],
    };

    const merged = mergeSnapshotIntoHistory(history, snapshot);

    expect(merged.repositories[0].samples).toEqual([
      {
        date: "2026-06-15",
        stars: 14,
        forks: 3,
        rank: 2,
        rankByCategory: 1,
      },
    ]);
  });

  it("merges committed seed history with deployed history without dropping samples", () => {
    const committedHistory = {
      generatedAt: "2026-06-12T00:00:00.000Z",
      retentionDays: 180,
      repositories: [
        {
          repo: "owner/good",
          samples: [
            {
              date: "2026-06-12",
              stars: 10,
              forks: 2,
              rank: 3,
              rankByCategory: 1,
            },
          ],
        },
      ],
    };
    const deployedHistory = {
      generatedAt: "2026-06-15T00:00:00.000Z",
      retentionDays: 180,
      repositories: [
        {
          repo: "owner/good",
          samples: [
            {
              date: "2026-06-15",
              stars: 14,
              forks: 3,
              rank: 2,
              rankByCategory: 1,
            },
          ],
        },
      ],
    };

    const merged = mergeHistoryPayloads([committedHistory, deployedHistory]);

    expect(merged.repositories[0].samples).toEqual([
      {
        date: "2026-06-12",
        stars: 10,
        forks: 2,
        rank: 3,
        rankByCategory: 1,
      },
      {
        date: "2026-06-15",
        stars: 14,
        forks: 3,
        rank: 2,
        rankByCategory: 1,
      },
    ]);
  });

  it("keeps only samples within the retention window", () => {
    const oldSamples = Array.from({ length: 182 }, (_, index) => ({
      date: new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10),
      stars: index,
      forks: 0,
      rank: 1,
      rankByCategory: 1,
    }));
    const history = {
      generatedAt: "2026-06-15T00:00:00.000Z",
      retentionDays: 180,
      repositories: [{ repo: "owner/good", samples: oldSamples }],
    };
    const snapshot = {
      generatedAt: "2026-06-15T12:00:00.000Z",
      repositories: [
        {
          repo: "owner/good",
          stars: 200,
          forks: 4,
          rank: 1,
          rankByCategory: 1,
        },
      ],
    };

    const merged = mergeSnapshotIntoHistory(history, snapshot, 30);

    expect(merged.retentionDays).toBe(30);
    expect(merged.repositories[0].samples.at(0).date).toBe("2026-06-15");
    expect(merged.repositories[0].samples).toHaveLength(1);
  });

  it("calculates 7-day and 30-day star growth and rank deltas", () => {
    const history = {
      generatedAt: "2026-06-14T00:00:00.000Z",
      retentionDays: 180,
      repositories: [
        {
          repo: "owner/good",
          samples: [
            {
              date: "2026-05-16",
              stars: 50,
              forks: 1,
              rank: 10,
              rankByCategory: 2,
            },
            {
              date: "2026-06-08",
              stars: 80,
              forks: 2,
              rank: 5,
              rankByCategory: 1,
            },
          ],
        },
      ],
    };
    const snapshot = {
      generatedAt: "2026-06-15T12:00:00.000Z",
      repositories: [
        {
          repo: "owner/good",
          stars: 100,
          forks: 3,
          rank: 3,
          rankByCategory: 1,
        },
      ],
    };

    const trended = addTrendMetricsToSnapshot(snapshot, history);

    expect(trended.repositories[0]).toMatchObject({
      growth7d: 20,
      growth30d: 50,
      rankDelta7d: 2,
      rankDelta30d: 7,
      trendStatus: "ready",
    });
  });

  it("marks trend fields as collecting when history is too young", () => {
    const history = {
      generatedAt: "2026-06-14T00:00:00.000Z",
      retentionDays: 180,
      repositories: [
        {
          repo: "owner/good",
          samples: [
            {
              date: "2026-06-14",
              stars: 99,
              forks: 2,
              rank: 3,
              rankByCategory: 1,
            },
          ],
        },
      ],
    };
    const snapshot = {
      generatedAt: "2026-06-15T12:00:00.000Z",
      repositories: [
        {
          repo: "owner/good",
          stars: 100,
          forks: 3,
          rank: 3,
          rankByCategory: 1,
        },
      ],
    };

    const trended = addTrendMetricsToSnapshot(snapshot, history);

    expect(trended.repositories[0]).toMatchObject({
      growth7d: null,
      growth30d: null,
      rankDelta7d: null,
      rankDelta30d: null,
      trendStatus: "collecting",
    });
  });

  it("does not write fake history samples when refresh only reused stale snapshot data", () => {
    const history = {
      generatedAt: "2026-06-14T00:00:00.000Z",
      retentionDays: 180,
      repositories: [
        {
          repo: "owner/good",
          samples: [
            {
              date: "2026-06-08",
              stars: 80,
              forks: 2,
              rank: 5,
              rankByCategory: 1,
            },
          ],
        },
      ],
    };
    const snapshot = {
      generatedAt: "2026-06-15T12:00:00.000Z",
      repositories: [
        {
          repo: "owner/good",
          stars: 80,
          forks: 2,
          rank: 5,
          rankByCategory: 1,
          errorMessage: "GitHub API 403: rate limited",
        },
      ],
    };

    const trended = addTrendMetricsToSnapshot(snapshot, history);
    const merged = mergeSnapshotIntoHistory(history, trended);

    expect(trended.repositories[0].trendStatus).toBe("collecting");
    expect(merged.repositories[0].samples).toHaveLength(1);
    expect(merged.repositories[0].samples[0].date).toBe("2026-06-08");
  });
});
