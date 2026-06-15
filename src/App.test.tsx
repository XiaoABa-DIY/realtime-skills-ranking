import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const snapshot = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  source: "test",
  repositories: [
    {
      repo: "alpha/agents",
      fullName: "alpha/agents",
      category: "Coding Agents",
      platforms: ["Agents"],
      tags: ["workflow"],
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
      growth7d: 5,
      growth30d: 13,
      rankDelta7d: 2,
      rankDelta30d: 4,
      trendStatus: "ready",
    },
  ],
};

const candidates = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  source: "test",
  candidates: [
    {
      repo: "new/skill",
      fullName: "new/skill",
      category: "Prompt & Workflow",
      matchedQuery: "prompt-workflows",
      reason: { zh: "候选", en: "Candidate" },
      description: "Prompt collection",
      stars: 10,
      forks: 1,
      language: "Markdown",
      license: "MIT",
      htmlUrl: "https://github.com/new/skill",
      pushedAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
      alreadyCurated: false,
      lastFetchedAt: "2026-01-03T00:00:00Z",
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
        if (url.includes("candidates.json")) {
          return Promise.resolve(
            new Response(JSON.stringify(candidates), { status: 200 }),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              full_name: "alpha/agents",
              stargazers_count: 25,
              forks_count: 5,
              open_issues_count: 1,
              subscribers_count: 2,
              language: "Python",
              license: { spdx_id: "MIT" },
              html_url: "https://github.com/alpha/agents",
              updated_at: "2026-01-05T00:00:00Z",
              pushed_at: "2026-01-05T00:00:00Z",
            }),
            { status: 200 },
          ),
        );
      }),
    );
  });

  it("renders the product exploration sections", async () => {
    render(<App />);

    expect((await screen.findAllByText("alpha/agents")).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("new/skill")).toBeInTheDocument();
    expect(screen.getByText("Top 3 trending projects")).toBeInTheDocument();
    expect(screen.getByText("Today picks")).toBeInTheDocument();
    expect(screen.getByText("Developer tools")).toBeInTheDocument();
    expect(screen.getByText("7-day growth")).toBeInTheDocument();
    expect(screen.getByText("30-day growth")).toBeInTheDocument();
    expect(screen.getByText("Fastest risers")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search repos/i)).toBeInTheDocument();
  });

  it("opens a detail drawer and refreshes live GitHub data", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click((await screen.findAllByText("alpha/agents"))[0]);

    expect(
      screen.getAllByRole("link", { name: /Open GitHub/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Copy skill link/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("+5 / 7d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+13 / 30d").length).toBeGreaterThan(0);
    expect(screen.getAllByText("↑2").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: /Refresh this repo/i }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Loaded current GitHub data."),
      ).toBeInTheDocument(),
    );
    expect(screen.getAllByText("25")[0]).toBeInTheDocument();
  });

  it("keeps quick filters in the URL and persists local favorites", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await screen.findByText("Developer tools");

    await user.click(
      screen.getAllByRole("button", { name: "Save this skill" })[0],
    );
    expect(screen.getAllByText(/My favorites 1/).length).toBeGreaterThan(0);

    await user.click(
      screen.getAllByRole("button", { name: /My favorites 1/ })[0],
    );
    expect(window.location.search).toContain("favorites=1");

    await user.click(screen.getByRole("button", { name: "View hot now" }));
    await waitFor(() =>
      expect(window.location.search).toContain("spotlight=weeklyHot"),
    );

    await user.click(screen.getByRole("button", { name: /7-day growth/i }));
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
