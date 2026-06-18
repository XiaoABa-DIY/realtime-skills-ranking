import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  addTrendMetricsToSnapshot,
  buildCandidates,
  buildSnapshot,
  calculateChineseScore,
  createHistoryFromSnapshot,
  isAcceptedSkillPath,
  mergeHistoryPayloads,
  mergeSnapshotIntoHistory,
  normalizeRepoName,
  updateData,
} from "./update-data.mjs";

function repoMeta(fullName, overrides = {}) {
  const [owner, name] = fullName.split("/");
  return {
    full_name: fullName,
    name,
    owner: { login: owner },
    description: overrides.description ?? "中文 Skill 仓库",
    stargazers_count: overrides.stars ?? 100,
    forks_count: overrides.forks ?? 10,
    open_issues_count: overrides.openIssues ?? 2,
    watchers_count: overrides.watchers ?? overrides.stars ?? 100,
    language: overrides.language ?? "Markdown",
    license: overrides.license ?? { spdx_id: "MIT", name: "MIT License" },
    topics: overrides.topics ?? ["skills", "chinese"],
    homepage: overrides.homepage ?? "",
    html_url: `https://github.com/${fullName}`,
    default_branch: overrides.defaultBranch ?? "main",
    archived: overrides.archived ?? false,
    disabled: false,
    created_at: overrides.createdAt ?? "2026-05-01T00:00:00.000Z",
    updated_at: overrides.updatedAt ?? "2026-06-14T00:00:00.000Z",
    pushed_at: overrides.pushedAt ?? "2026-06-15T00:00:00.000Z",
  };
}

function tree(paths) {
  return {
    tree: paths.map((itemPath) => ({
      path: itemPath,
      type: "blob",
    })),
  };
}

function content(text) {
  return {
    content: Buffer.from(text, "utf8").toString("base64"),
    encoding: "base64",
  };
}

function createGithubFetch(routes) {
  return async (url) => {
    const pathname = new URL(url).pathname;
    const query = new URL(url).search;
    const key = `${pathname}${query}`;
    if (routes[key]) return routes[key];
    if (routes[pathname]) return routes[pathname];
    throw new Error(`Unexpected GitHub URL: ${url}`);
  };
}

const curatedSkills = [
  {
    repo: "owner/content-skill",
    category: "内容创作",
    tags: ["写作", "中文"],
    audiences: ["media", "writing"],
    summary: {
      zh: "面向自媒体创作者的中文写作 Skill。",
      en: "Chinese writing skill for creators.",
    },
    featured: true,
  },
  {
    repo: "owner/research-skill",
    category: "数据研究",
    tags: ["research"],
    audiences: ["data"],
    summary: {
      zh: "用于资料研究和结构化报告的 Skill。",
    },
  },
];

describe("GitHub skill data helpers", () => {
  it("normalizes repo names and accepts strict SKILL.md paths", () => {
    expect(normalizeRepoName(" https://github.com/Owner/Repo ")).toBe(
      "Owner/Repo",
    );
    expect(isAcceptedSkillPath("SKILL.md")).toBe(true);
    expect(isAcceptedSkillPath("skills/writing/SKILL.md")).toBe(true);
    expect(isAcceptedSkillPath("packs/skills/writing/SKILL.md")).toBe(true);
    expect(isAcceptedSkillPath("README.md")).toBe(false);
  });

  it("scores Chinese-first descriptions higher than English-only text", () => {
    expect(
      calculateChineseScore(
        "中文 Skill 仓库，提供写作、研究和内容生产能力。",
        "English only skill repository.",
      ),
    ).toBeGreaterThan(calculateChineseScore("English only skill repository."));
  });

  it("builds a GitHub stars snapshot from curated repositories", async () => {
    const githubFetch = createGithubFetch({
      "/repos/owner/content-skill": repoMeta("owner/content-skill", {
        stars: 900,
        forks: 88,
        topics: ["skills", "content"],
      }),
      "/repos/owner/content-skill/git/trees/main?recursive=1": tree([
        "skills/writing/SKILL.md",
        "README.md",
      ]),
      "/repos/owner/content-skill/readme": content(
        "# 中文写作 Skill\n\n适合公众号、小红书和长文创作。",
      ),
      "/repos/owner/content-skill/contents/skills%2Fwriting%2FSKILL.md":
        content("---\nname: 中文写作\n---\n帮助创作者写作。"),
      "/repos/owner/research-skill": repoMeta("owner/research-skill", {
        stars: 300,
        forks: 18,
      }),
      "/repos/owner/research-skill/git/trees/main?recursive=1": tree([
        "skills/research/SKILL.md",
      ]),
      "/repos/owner/research-skill/readme": content("# Research Skill"),
      "/repos/owner/research-skill/contents/skills%2Fresearch%2FSKILL.md":
        content("资料研究 Skill"),
    });

    const snapshot = await buildSnapshot({
      skillInputs: curatedSkills,
      githubFetch,
      generatedAt: "2026-06-16T00:00:00.000Z",
    });

    expect(snapshot).toMatchObject({
      schemaVersion: 3,
      source: "agent-skills-radar",
    });
    expect(snapshot.skills.map((skill) => skill.repo)).toEqual([
      "owner/content-skill",
      "owner/research-skill",
    ]);
    expect(snapshot.skills[0]).toMatchObject({
      repo: "owner/content-skill",
      stars: 900,
      forks: 88,
      skillMdPaths: ["skills/writing/SKILL.md"],
      rank: 1,
      rankByCategory: 1,
      fetchStatus: "ok",
      featured: true,
    });
  });

  it("discovers candidates while excluding MCP and agent framework projects", async () => {
    const githubFetch = createGithubFetch({
      "/search/repositories?q=SKILL.md+skills&sort=stars&order=desc&per_page=3":
        {
          items: [
            repoMeta("owner/candidate-skill", {
              stars: 50,
              description: "A reusable SKILL.md library",
            }),
            repoMeta("modelcontextprotocol/servers", {
              stars: 999,
              description: "MCP server collection",
              topics: ["mcp", "server"],
            }),
            repoMeta("owner/no-skill", {
              stars: 20,
              description: "No skill files here",
            }),
          ],
        },
      "/repos/owner/candidate-skill/git/trees/main?recursive=1": tree([
        "skills/demo/SKILL.md",
      ]),
      "/repos/modelcontextprotocol/servers/git/trees/main?recursive=1": tree([
        "README.md",
      ]),
      "/repos/owner/no-skill/git/trees/main?recursive=1": tree(["README.md"]),
    });

    const candidates = await buildCandidates({
      queries: [
        {
          id: "skill-md",
          query: "SKILL.md skills",
          limit: 3,
          reason: { zh: "包含 SKILL.md 关键词", en: "Mentions SKILL.md" },
        },
      ],
      curatedRepos: new Set(["owner/content-skill"]),
      githubFetch,
      generatedAt: "2026-06-16T00:00:00.000Z",
    });

    expect(candidates.source).toBe("github-search");
    expect(candidates.candidates.map((candidate) => candidate.repo)).toEqual([
      "owner/candidate-skill",
    ]);
    expect(candidates.candidates[0]).toMatchObject({
      matchedQuery: "skill-md",
      alreadyCurated: false,
      skillMdPaths: ["skills/demo/SKILL.md"],
    });
  });

  it("falls back to the previous v3 snapshot when GitHub refresh fails", async () => {
    const previousSnapshot = {
      schemaVersion: 3,
      generatedAt: "2026-06-01T00:00:00.000Z",
      source: "agent-skills-radar",
      categories: [],
      skills: [
        {
          repo: "owner/content-skill",
          name: "content-skill",
          descriptionZh: "旧快照",
          descriptionEn: "",
          readmeSnippetZh: "",
          readmeSnippetEn: "",
          categoryCode: "content",
          categoryName: { zh: "内容创作", en: "Content Creation" },
          tags: [],
          audiences: ["media"],
          useCases: [],
          skillMdPaths: ["skills/writing/SKILL.md"],
          stars: 10,
          forks: 1,
          openIssues: 0,
          watchers: 10,
          language: "",
          license: "",
          topics: [],
          homepage: "",
          htmlUrl: "https://github.com/owner/content-skill",
          createdAt: "",
          updatedAt: "",
          pushedAt: "",
          lastFetchedAt: "",
          fetchStatus: "ok",
          rank: 1,
          rankByCategory: 1,
          growth7d: null,
          growth30d: null,
          rankDelta7d: null,
          rankDelta30d: null,
          trendStatus: "collecting",
          chineseScore: 50,
          skillSignalScore: 100,
          featured: false,
        },
      ],
    };

    const snapshot = await buildSnapshot({
      skillInputs: curatedSkills,
      githubFetch: async () => {
        throw new Error("rate limited");
      },
      previousSnapshot,
      generatedAt: "2026-06-16T00:00:00.000Z",
    });

    expect(snapshot.source).toBe("github-skills-fallback");
    expect(snapshot.skills[0]).toMatchObject({
      repo: "owner/content-skill",
      fetchStatus: "fallback",
    });
  });

  it("seeds, merges, trims, and calculates star growth history", () => {
    const snapshot = {
      schemaVersion: 3,
      generatedAt: "2026-06-15T12:00:00.000Z",
      skills: [
        {
          repo: "owner/content-skill",
          stars: 300,
          forks: 40,
          rank: 2,
          rankByCategory: 1,
          fetchStatus: "ok",
        },
      ],
    };
    const seeded = createHistoryFromSnapshot(snapshot);

    expect(seeded.repositories[0].samples[0]).toMatchObject({
      date: "2026-06-15",
      stars: 300,
      forks: 40,
      rank: 2,
      rankByCategory: 1,
    });

    const history = {
      schemaVersion: 3,
      generatedAt: "2026-06-08T00:00:00.000Z",
      retentionDays: 180,
      repositories: [
        {
          repo: "owner/content-skill",
          samples: [
            {
              date: "2026-06-08",
              stars: 210,
              forks: 30,
              rank: 5,
              rankByCategory: 1,
            },
          ],
        },
      ],
    };
    const trended = addTrendMetricsToSnapshot(snapshot, history);
    const merged = mergeSnapshotIntoHistory(history, trended);

    expect(trended.skills[0]).toMatchObject({
      growth7d: 90,
      rankDelta7d: 3,
      trendStatus: "collecting",
    });
    expect(merged.repositories[0].samples).toHaveLength(2);
  });

  it("merges committed and deployed GitHub history payloads", () => {
    const merged = mergeHistoryPayloads([
      {
        schemaVersion: 3,
        generatedAt: "2026-06-01T00:00:00.000Z",
        retentionDays: 180,
        repositories: [
          {
            repo: "owner/a",
            samples: [
              {
                date: "2026-06-01",
                stars: 1,
                forks: 1,
                rank: 2,
                rankByCategory: 1,
              },
            ],
          },
        ],
      },
      {
        schemaVersion: 3,
        generatedAt: "2026-06-02T00:00:00.000Z",
        retentionDays: 180,
        repositories: [
          {
            repo: "owner/a",
            samples: [
              {
                date: "2026-06-02",
                stars: 2,
                forks: 1,
                rank: 1,
                rankByCategory: 1,
              },
            ],
          },
        ],
      },
    ]);

    expect(merged.repositories[0].samples).toHaveLength(2);
    expect(merged.generatedAt).toBe("2026-06-02T00:00:00.000Z");
  });

  it("reuses previous candidates when GitHub search is temporarily unavailable", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "skills-data-"));
    const skillsPath = path.join(tempDir, "skills.yml");
    const discoveryPath = path.join(tempDir, "discovery-queries.yml");
    const snapshotPath = path.join(tempDir, "snapshot.json");
    const candidatesPath = path.join(tempDir, "candidates.json");
    const historyPath = path.join(tempDir, "history.json");

    await fs.writeFile(skillsPath, "skills: []\n");
    await fs.writeFile(
      discoveryPath,
      "queries:\n  - id: skill-md\n    query: SKILL.md skills\n    limit: 1\n",
    );
    await fs.writeFile(
      candidatesPath,
      JSON.stringify({
        generatedAt: "2026-06-01T00:00:00.000Z",
        source: "github-search",
        candidates: [
          {
            repo: "owner/candidate-skill",
            name: "candidate-skill",
            description: "candidate",
            stars: 1,
            forks: 0,
            htmlUrl: "https://github.com/owner/candidate-skill",
            language: "",
            topics: [],
            skillMdPaths: ["skills/demo/SKILL.md"],
            matchedQuery: "skill-md",
            reason: { zh: "发现", en: "discovered" },
            alreadyCurated: false,
            suggestedCategory: "content",
            suggestedAudiences: ["beginner"],
            confidence: 70,
          },
        ],
      }),
    );

    const result = await updateData({
      skillsPath,
      discoveryPath,
      snapshotPath,
      candidatesPath,
      historyPath,
      githubFetch: async () => {
        throw new Error("rate limited");
      },
    });

    expect(result.candidates).toMatchObject({
      source: "github-search-fallback",
      candidates: [{ repo: "owner/candidate-skill" }],
    });
  });
});
