import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/repos/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        full_name: "modelcontextprotocol/servers",
        description: "Live MCP servers data",
        stargazers_count: 999,
        forks_count: 88,
        open_issues_count: 7,
        subscribers_count: 11,
        language: "TypeScript",
        license: { spdx_id: "MIT" },
        homepage: "https://modelcontextprotocol.io",
        html_url: "https://github.com/modelcontextprotocol/servers",
        pushed_at: "2026-05-01T00:00:00Z",
        updated_at: "2026-05-02T00:00:00Z",
        archived: false,
        disabled: false,
      }),
    });
  });
});

test("renders the dashboard and filters repositories", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "AI Skills 实时排行榜" }),
  ).toBeVisible();
  await expect(page.getByText("modelcontextprotocol/servers")).toBeVisible();

  await page.getByPlaceholder("搜索仓库、标签、平台或简介").fill("ComfyUI");
  await expect(page.getByText("Comfy-Org/ComfyUI")).toBeVisible();
});

test("opens details and refreshes a repository live", async ({ page }) => {
  await page.goto("/");
  await page.getByText("modelcontextprotocol/servers").first().click();
  await page.getByRole("button", { name: /刷新此仓库/ }).click();

  await expect(page.getByText("已读取 GitHub 当前数据。")).toBeVisible();
  await expect(page.getByText("999").first()).toBeVisible();
});
