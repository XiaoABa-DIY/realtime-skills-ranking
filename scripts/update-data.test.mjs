import { describe, expect, it } from "vitest";
import {
  addTrendMetricsToSnapshot,
  buildCandidates,
  buildSnapshot,
  calculateHeatScore,
  createHistoryFromSnapshot,
  displayStatusToBadge,
  mergeHistoryPayloads,
  mergeSnapshotIntoHistory,
  normalizeSkillCode,
  parsePlatformInfo,
} from "./update-data.mjs";

function redfoxSkill(overrides = {}) {
  return {
    skillNo: overrides.skillNo ?? "wn2Hrw42",
    skillName: overrides.skillName ?? "多平台违禁词检测",
    nameEn: overrides.nameEn ?? "Multi-Platform Word Check",
    skillCode: overrides.skillCode ?? "multi-wordcheck",
    categoryId: overrides.categoryId ?? 8,
    categories: overrides.categories ?? [
      {
        categoryCode: "efficiency_tools",
        categoryName: "效率工具",
      },
    ],
    description: overrides.description ?? null,
    iconUrl: null,
    icon: "iconfont:narrow",
    price: 0,
    usageCount: 0,
    viewCount: overrides.viewCount ?? 400,
    downloadCount: overrides.downloadCount ?? 300,
    displayStatus: overrides.displayStatus ?? 1,
    status: 1,
    tags: overrides.tags ?? ["合规审核", "内容改写", "违禁词检测"],
    introduce: overrides.introduce ?? "覆盖公众号、小红书、抖音的违禁词检测。",
    introduceEn:
      overrides.introduceEn ??
      "Compliance checks for WeChat, Xiaohongshu, and Douyin.",
    readme: overrides.readme ?? "# 多平台违禁词检测\n\n使用说明",
    readmeEn: overrides.readmeEn ?? "# Multi-Platform Word Check\n\nUsage",
    hasApiKey: true,
    platformInfo:
      overrides.platformInfo ??
      '[{"name":"github","repo":"https://github.com/redfox-data/redfox-community/tree/main/skills/multi-wordcheck"},{"name":"skills-cli","repo":"redfox-data/redfox-community"}]',
    sortOrder: 0,
    createTime: overrides.createTime ?? "2026-05-27 20:27:54",
    updateTime: overrides.updateTime ?? "2026-06-16 10:08:20",
  };
}

function createRedfoxFetch(recordsByPage) {
  return async (url) => {
    if (url.includes("/skills/categories")) {
      return {
        code: 2000,
        data: [
          {
            id: 1,
            categoryName: "全部",
            nameEn: "All",
            categoryCode: "all",
            sortOrder: 0,
          },
          {
            id: 8,
            categoryName: "效率工具",
            nameEn: "Efficiency Tools",
            categoryCode: "efficiency_tools",
            sortOrder: 7,
          },
        ],
      };
    }

    const pageNum = Number(new URL(url).searchParams.get("pageNum"));
    return {
      code: 2000,
      data: {
        records: recordsByPage[pageNum] ?? [],
        total: Object.values(recordsByPage).flat().length,
        pages: Object.keys(recordsByPage).length,
      },
    };
  };
}

function createGitHubFetch() {
  return async (url) => {
    if (url.endsWith("/contents/skills")) {
      return [
        {
          name: "multi-wordcheck",
          path: "skills/multi-wordcheck",
          type: "dir",
          html_url:
            "https://github.com/redfox-data/redfox-community/tree/main/skills/multi-wordcheck",
        },
      ];
    }

    if (url.endsWith("/contents/skills/multi-wordcheck/SKILL.md")) {
      return {
        content: Buffer.from(
          "---\nname: multi-wordcheck\ndescription: 多平台检测\n---\n",
        ).toString("base64"),
      };
    }

    throw new Error(`Unexpected GitHub URL: ${url}`);
  };
}

describe("update-data script helpers", () => {
  it("normalizes RedFox skill codes and platform info", () => {
    expect(normalizeSkillCode(" skills/douyin-search/ ")).toBe("douyin-search");
    expect(
      parsePlatformInfo(
        '[{"name":"github","repo":"https://example.com"},{"name":"skills-cli","repo":"redfox-data/redfox-community"}]',
      ),
    ).toEqual([
      {
        name: "github",
        value: "https://example.com",
        url: "https://example.com",
      },
      {
        name: "skills-cli",
        value: "redfox-data/redfox-community",
      },
    ]);
    expect(parsePlatformInfo("{broken")).toEqual([]);
  });

  it("maps display badges and calculates deterministic heat score", () => {
    expect(displayStatusToBadge(1)).toEqual({ zh: "热门", en: "Hot" });
    expect(displayStatusToBadge(2)).toEqual({ zh: "推荐", en: "Recommended" });
    expect(displayStatusToBadge(3)).toEqual({ zh: "上新", en: "New" });
    expect(
      calculateHeatScore(
        {
          downloadCount: 300,
          viewCount: 400,
          displayStatus: 1,
          updatedAt: "2026-06-16T02:08:20.000Z",
        },
        "2026-06-16T10:00:00.000Z",
      ),
    ).toBeGreaterThan(600);
  });

  it("builds RedFox snapshots from paginated API and GitHub metadata", async () => {
    const snapshot = await buildSnapshot({
      redfoxFetch: createRedfoxFetch({
        1: [redfoxSkill({ downloadCount: 300 })],
        2: [
          redfoxSkill({
            skillNo: "abc",
            skillCode: "douyin-search",
            skillName: "抖音作品查询",
            nameEn: "Douyin Search",
            downloadCount: 200,
            viewCount: 100,
            displayStatus: 0,
            platformInfo: "[]",
          }),
        ],
      }),
      githubFetch: createGitHubFetch(),
    });

    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.skills).toHaveLength(2);
    expect(snapshot.skills[0]).toMatchObject({
      skillCode: "multi-wordcheck",
      displayBadge: { zh: "热门", en: "Hot" },
      categoryCode: "efficiency_tools",
      githubUrl:
        "https://github.com/redfox-data/redfox-community/tree/main/skills/multi-wordcheck",
      fetchStatus: "ok",
      rank: 1,
      rankByCategory: 1,
    });
    expect(snapshot.skills[0].heatScore).toBeGreaterThan(
      snapshot.skills[1].heatScore,
    );
  });

  it("reuses previous v2 snapshot when RedFox API fails", async () => {
    const previousSnapshot = {
      schemaVersion: 2,
      generatedAt: "2026-06-01T00:00:00.000Z",
      source: "redfox-api+github",
      categories: [],
      sourceRepo: {
        fullName: "redfox-data/redfox-community",
        htmlUrl: "https://github.com/redfox-data/redfox-community",
      },
      skills: [
        {
          ...redfoxSkill(),
          skillCode: "multi-wordcheck",
          name: { zh: "多平台违禁词检测", en: "Word Check" },
          description: { zh: "", en: "" },
          introduce: { zh: "", en: "" },
          readme: { zh: "", en: "" },
          categoryCode: "efficiency_tools",
          categoryName: { zh: "效率工具", en: "Efficiency Tools" },
          categories: [],
          tags: [],
          accessMethods: [],
          redfoxUrl: "https://redfox.hk/skills/no/wn2Hrw42",
          githubUrl: "",
          githubPath: "",
          heatScore: 10,
          rank: 1,
          rankByCategory: 1,
          createdAt: "",
          updatedAt: "",
          lastFetchedAt: "",
          fetchStatus: "ok",
          downloadGrowth7d: null,
          downloadGrowth30d: null,
          rankDelta7d: null,
          rankDelta30d: null,
          trendStatus: "collecting",
          audiences: [],
          useCases: [],
        },
      ],
    };

    const snapshot = await buildSnapshot({
      redfoxFetch: async () => {
        throw new Error("RedFox unavailable");
      },
      githubFetch: createGitHubFetch(),
      previousSnapshot,
    });

    expect(snapshot.source).toBe("redfox-api-fallback");
    expect(snapshot.skills[0]).toMatchObject({
      skillCode: "multi-wordcheck",
      fetchStatus: "fallback",
    });
  });

  it("builds an empty candidate payload for compatibility", () => {
    expect(buildCandidates("2026-06-01T00:00:00.000Z")).toEqual({
      generatedAt: "2026-06-01T00:00:00.000Z",
      source: "redfox-skills",
      candidates: [],
    });
  });

  it("seeds, merges, trims, and calculates usage growth history", () => {
    const snapshot = {
      schemaVersion: 2,
      generatedAt: "2026-06-15T12:00:00.000Z",
      skills: [
        {
          skillCode: "multi-wordcheck",
          downloadCount: 300,
          viewCount: 400,
          heatScore: 900,
          rank: 2,
          rankByCategory: 1,
          fetchStatus: "ok",
        },
      ],
    };
    const seeded = createHistoryFromSnapshot(snapshot);

    expect(seeded.skills[0].samples[0]).toMatchObject({
      date: "2026-06-15",
      downloadCount: 300,
      viewCount: 400,
      heatScore: 900,
      rank: 2,
      rankByCategory: 1,
    });

    const history = {
      schemaVersion: 2,
      generatedAt: "2026-06-08T00:00:00.000Z",
      retentionDays: 180,
      skills: [
        {
          skillCode: "multi-wordcheck",
          samples: [
            {
              date: "2026-06-08",
              downloadCount: 210,
              viewCount: 300,
              heatScore: 810,
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
      downloadGrowth7d: 90,
      rankDelta7d: 3,
      trendStatus: "collecting",
    });
    expect(merged.skills[0].samples).toHaveLength(2);
  });

  it("merges committed and deployed history payloads", () => {
    const merged = mergeHistoryPayloads([
      {
        schemaVersion: 2,
        generatedAt: "2026-06-01T00:00:00.000Z",
        retentionDays: 180,
        skills: [
          {
            skillCode: "a",
            samples: [
              {
                date: "2026-06-01",
                downloadCount: 1,
                viewCount: 1,
                heatScore: 1,
                rank: 2,
                rankByCategory: 1,
              },
            ],
          },
        ],
      },
      {
        schemaVersion: 2,
        generatedAt: "2026-06-02T00:00:00.000Z",
        retentionDays: 180,
        skills: [
          {
            skillCode: "a",
            samples: [
              {
                date: "2026-06-02",
                downloadCount: 2,
                viewCount: 2,
                heatScore: 2,
                rank: 1,
                rankByCategory: 1,
              },
            ],
          },
        ],
      },
    ]);

    expect(merged.skills[0].samples).toHaveLength(2);
    expect(merged.generatedAt).toBe("2026-06-02T00:00:00.000Z");
  });
});
