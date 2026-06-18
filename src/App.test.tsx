import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const snapshot = {
  schemaVersion: 3,
  generatedAt: "2026-06-16T02:00:00.000Z",
  source: "github-skills",
  categories: [
    {
      code: "content",
      name: { zh: "内容创作", en: "Content Creation" },
      sortOrder: 1,
    },
    {
      code: "data",
      name: { zh: "数据研究", en: "Data Research" },
      sortOrder: 5,
    },
  ],
  skills: [
    {
      repo: "owner/content-skill",
      name: "content-skill",
      descriptionZh: "面向公众号、小红书和长文创作的中文写作 Skill。",
      descriptionEn: "Chinese writing skill for creators.",
      readmeSnippetZh: "# 中文写作 Skill\n\n适合公众号、小红书和长文创作。",
      readmeSnippetEn: "# Chinese Writing Skill",
      categoryCode: "content",
      categoryName: { zh: "内容创作", en: "Content Creation" },
      tags: ["写作", "中文"],
      audiences: ["media", "writing"],
      useCases: [
        {
          zh: "适合自媒体创作者做选题、改写和长文生产。",
          en: "Good for creators doing topic work, rewriting, and long-form writing.",
        },
      ],
      skillMdPaths: ["skills/writing/SKILL.md"],
      stars: 900,
      forks: 88,
      openIssues: 2,
      watchers: 900,
      language: "Markdown",
      license: "MIT",
      topics: ["skills", "content"],
      homepage: "https://example.com/content-skill",
      htmlUrl: "https://github.com/owner/content-skill",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
      pushedAt: "2026-06-15T00:00:00.000Z",
      lastFetchedAt: "2026-06-16T02:00:00.000Z",
      fetchStatus: "ok",
      rank: 1,
      rankByCategory: 1,
      growth7d: 90,
      growth30d: null,
      rankDelta7d: 2,
      rankDelta30d: null,
      trendStatus: "collecting",
      chineseScore: 95,
      skillSignalScore: 100,
      featured: true,
    },
    {
      repo: "owner/research-skill",
      name: "research-skill",
      descriptionZh: "用于资料研究、结构化报告和数据分析的 Skill。",
      descriptionEn: "Research and report skill.",
      readmeSnippetZh: "# 研究 Skill",
      readmeSnippetEn: "# Research Skill",
      categoryCode: "data",
      categoryName: { zh: "数据研究", en: "Data Research" },
      tags: ["研究", "数据"],
      audiences: ["data"],
      useCases: [
        {
          zh: "适合研究者做资料整理和报告生成。",
          en: "Useful for research and report generation.",
        },
      ],
      skillMdPaths: ["skills/research/SKILL.md"],
      stars: 300,
      forks: 21,
      openIssues: 1,
      watchers: 300,
      language: "Markdown",
      license: "MIT",
      topics: ["skills", "research"],
      homepage: "",
      htmlUrl: "https://github.com/owner/research-skill",
      createdAt: "2026-05-02T00:00:00.000Z",
      updatedAt: "2026-06-14T00:00:00.000Z",
      pushedAt: "2026-06-14T00:00:00.000Z",
      lastFetchedAt: "2026-06-16T02:00:00.000Z",
      fetchStatus: "ok",
      rank: 2,
      rankByCategory: 1,
      growth7d: null,
      growth30d: null,
      rankDelta7d: null,
      rankDelta30d: null,
      trendStatus: "collecting",
      chineseScore: 90,
      skillSignalScore: 100,
      featured: false,
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

  it("renders the radar search hero and ranking list workspace", async () => {
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: "AI Skills Radar",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Today Top Skill")).toBeInTheDocument();
    expect(screen.getByText("Recommended entry points")).toBeInTheDocument();
    expect(screen.getAllByText("Media creators").length).toBeGreaterThan(0);
    await userEvent.click(
      screen.getByRole("button", { name: /Advanced filters/i }),
    );
    expect(
      screen.getByRole("region", { name: /Ranking list/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("7-day star growth")).toBeInTheDocument();
    expect(screen.getByText("Fastest risers")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search skills/i)).toBeInTheDocument();
    expect(screen.getAllByText("content-skill").length).toBeGreaterThan(0);
  });

  it("searches from the hero and reveals advanced filters on demand", async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("heading", { name: "AI Skills Radar" });

    await user.type(screen.getByPlaceholderText(/Search skills/i), "research");

    await waitFor(() => expect(window.location.search).toContain("q=research"));
    expect(screen.getAllByText("research-skill").length).toBeGreaterThan(0);

    expect(
      screen.queryByRole("combobox", { name: /Tag/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Advanced filters/i }));

    expect(screen.getByRole("combobox", { name: /Tag/i })).toBeInTheDocument();
  });

  it("opens a detail drawer with GitHub actions and skill paths", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click((await screen.findAllByText("content-skill"))[0]);

    expect(
      screen.getByRole("dialog", { name: "content-skill" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Open GitHub/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /Open homepage/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Copy skill link/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("skills/writing/SKILL.md")).toBeInTheDocument();
    expect(screen.getAllByText("+90 / 7d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("rank +2").length).toBeGreaterThan(0);
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

    await user.click(screen.getByRole("button", { name: /View top stars/i }));
    await waitFor(() =>
      expect(window.location.search).toContain("spotlight=topStars"),
    );

    await user.click(screen.getByRole("button", { name: /Advanced filters/i }));
    await user.click(
      screen.getByRole("button", { name: /7-day star growth/i }),
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
