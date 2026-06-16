import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const snapshot = {
  schemaVersion: 2,
  generatedAt: "2026-06-16T02:00:00.000Z",
  source: "redfox-api+github",
  sourceRepo: {
    fullName: "redfox-data/redfox-community",
    htmlUrl: "https://github.com/redfox-data/redfox-community",
  },
  categories: [
    {
      id: 1,
      code: "all",
      name: { zh: "全部", en: "All" },
      sortOrder: 0,
    },
    {
      id: 8,
      code: "efficiency_tools",
      name: { zh: "效率工具", en: "Efficiency Tools" },
      sortOrder: 7,
    },
  ],
  skills: [
    {
      skillNo: "wn2Hrw42",
      skillCode: "multi-wordcheck",
      name: {
        zh: "多平台违禁词检测",
        en: "Multi-Platform Word Check",
      },
      description: {
        zh: "违禁词检测",
        en: "Prohibited word check",
      },
      introduce: {
        zh: "覆盖公众号、小红书、抖音的违禁词检测。",
        en: "Compliance checks for WeChat, Xiaohongshu, and Douyin.",
      },
      readme: {
        zh: "# 多平台违禁词检测\n\n使用说明",
        en: "# Multi-Platform Word Check\n\nUsage",
      },
      categoryCode: "efficiency_tools",
      categoryName: { zh: "效率工具", en: "Efficiency Tools" },
      categories: [],
      tags: ["合规审核", "内容改写", "违禁词检测"],
      icon: "",
      iconUrl: "",
      price: 0,
      usageCount: 0,
      viewCount: 40362,
      downloadCount: 44942,
      displayStatus: 1,
      displayBadge: { zh: "热门", en: "Hot" },
      status: 1,
      hasApiKey: true,
      platformInfoRaw: "",
      accessMethods: [
        {
          name: "github",
          value:
            "https://github.com/redfox-data/redfox-community/tree/main/skills/multi-wordcheck",
          url: "https://github.com/redfox-data/redfox-community/tree/main/skills/multi-wordcheck",
        },
        { name: "skills-cli", value: "redfox-data/redfox-community" },
      ],
      redfoxUrl: "https://redfox.hk/skills/no/wn2Hrw42",
      githubUrl:
        "https://github.com/redfox-data/redfox-community/tree/main/skills/multi-wordcheck",
      githubPath: "skills/multi-wordcheck",
      heatScore: 1234,
      rank: 1,
      rankByCategory: 1,
      createdAt: "2026-05-27T12:27:54.000Z",
      updatedAt: "2026-06-16T02:08:20.000Z",
      lastFetchedAt: "2026-06-16T02:00:00.000Z",
      fetchStatus: "ok",
      downloadGrowth7d: 90,
      downloadGrowth30d: null,
      rankDelta7d: 2,
      rankDelta30d: null,
      trendStatus: "collecting",
      audiences: ["media", "wechat", "xiaohongshu", "douyin", "productivity"],
      useCases: [
        {
          zh: "适合自媒体创作者做内容合规检查。",
          en: "Useful for content compliance checks.",
        },
      ],
    },
  ],
};

describe("App", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/?lang=en");
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("snapshot.json")) {
          return Promise.resolve(
            new Response(JSON.stringify(snapshot), { status: 200 }),
          );
        }
        return Promise.resolve(new Response("{}", { status: 404 }));
      }),
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    });
  });

  it("renders the RedFox product exploration sections", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "RedFox Skills Heat Ranking",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Top 3 by heat")).toBeInTheDocument();
    expect(screen.getByText("Today picks")).toBeInTheDocument();
    expect(screen.getAllByText("Media creators").length).toBeGreaterThan(0);
    expect(screen.getByText("7-day usage growth")).toBeInTheDocument();
    expect(screen.getByText("Fastest risers")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search skills/i)).toBeInTheDocument();
    expect(
      screen.getAllByText("Multi-Platform Word Check").length,
    ).toBeGreaterThan(0);
  });

  it("opens a detail drawer with RedFox and GitHub actions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      (await screen.findAllByText("Multi-Platform Word Check"))[0],
    );

    expect(
      screen.getByRole("dialog", { name: "Multi-Platform Word Check" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open RedFox/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Open GitHub/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Copy skill link/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("+90 / 7d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("↑2").length).toBeGreaterThan(0);
  });

  it("keeps quick filters in the URL and persists local favorites", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await screen.findAllByText("Media creators");

    await user.click(
      screen.getAllByRole("button", { name: /Save this skill/i })[0],
    );
    expect(screen.getAllByText(/My favorites 1/).length).toBeGreaterThan(0);

    await user.click(
      screen.getAllByRole("button", { name: /My favorites 1/ })[0],
    );
    expect(window.location.search).toContain("favorites=1");

    await user.click(screen.getByRole("button", { name: /View hot skills/i }));
    await waitFor(() =>
      expect(window.location.search).toContain("spotlight=hot"),
    );

    await user.click(
      screen.getByRole("button", { name: /7-day usage growth/i }),
    );
    await waitFor(() =>
      expect(window.location.search).toContain("spotlight=growth7d"),
    );

    unmount();
    render(<App />);

    expect(
      (await screen.findAllByText(/My favorites 1/)).length,
    ).toBeGreaterThan(0);
  });
});
