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

  it("renders loaded ranking data and switches language", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByText("alpha/agents")).toBeInTheDocument();
    expect(screen.getByText("new/skill")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /EN/i }));

    expect(screen.getByText("AI Skills Live Ranking")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search repos/i)).toBeInTheDocument();
  });

  it("opens a detail drawer and refreshes live GitHub data", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByText("alpha/agents"));
    await user.click(screen.getByRole("button", { name: /刷新此仓库/i }));

    await waitFor(() =>
      expect(screen.getByText("已读取 GitHub 当前数据。")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("25")[0]).toBeInTheDocument();
  });
});
