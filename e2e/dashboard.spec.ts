import { expect, type Page, test } from "@playwright/test";

function repoPattern(repo: string) {
  return new RegExp(repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function getRepoEntry(page: Page, repo: string) {
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 600) {
    return page.getByRole("button", { name: repoPattern(repo) });
  }
  return page.getByRole("row", { name: repoPattern(repo) });
}

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

test("renders the product dashboard and filters repositories", async ({
  page,
}) => {
  await page.goto("/?lang=en");

  await expect(
    page.getByRole("heading", { name: "AI Skills Live Ranking" }),
  ).toBeVisible();
  await expect(page.getByText("Top 3 trending projects")).toBeVisible();
  await expect(page.getByText("Today picks")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Developer tools" }),
  ).toBeVisible();
  await expect(
    getRepoEntry(page, "modelcontextprotocol/servers"),
  ).toBeVisible();

  await page
    .getByPlaceholder("Search repos, tags, platforms, or summaries")
    .fill("ComfyUI");
  await expect(getRepoEntry(page, "Comfy-Org/ComfyUI")).toBeVisible();
  await expect(page).toHaveURL(/q=ComfyUI/);
});

test("opens details and refreshes a repository live", async ({ page }) => {
  await page.goto("/?lang=en");
  await getRepoEntry(page, "modelcontextprotocol/servers").click();

  const drawer = page.getByRole("dialog", {
    name: "modelcontextprotocol/servers",
  });

  await expect(
    drawer.getByRole("button", { name: /Copy skill link/i }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: /Save this skill/i }),
  ).toBeVisible();

  await drawer.getByRole("button", { name: /Refresh this repo/i }).click();

  await expect(page.getByText("Loaded current GitHub data.")).toBeVisible();
  await expect(drawer.getByText("999").first()).toBeVisible();
});

test("persists quick filters, favorites, and detail drawers in the URL", async ({
  page,
}) => {
  await page.goto("/?lang=en");

  await page.getByRole("button", { name: "Developer tools" }).click();
  await expect(page).toHaveURL(/audience=developer/);
  await expect(page).toHaveURL(/spotlight=developerStack/);

  await page
    .getByRole("button", { name: /Save this skill/i })
    .first()
    .click();
  await expect(page.getByText(/My favorites 1/).first()).toBeVisible();

  await page
    .getByRole("button", { name: /My favorites 1/ })
    .first()
    .click();
  await expect(page).toHaveURL(/favorites=1/);

  await page.reload();
  await expect(page.getByText(/My favorites 1/).first()).toBeVisible();

  await page.goto("/?lang=en&audience=creator&repo=Comfy-Org%2FComfyUI");
  await expect(
    page.getByRole("dialog", { name: "Comfy-Org/ComfyUI" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Who it fits" }),
  ).toBeVisible();
});

test("keeps the mobile ranking layout within the viewport", async ({
  page,
}) => {
  await page.goto("/?lang=en");
  await expect(
    getRepoEntry(page, "modelcontextprotocol/servers"),
  ).toBeVisible();

  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 600) {
    await expect(page.locator(".mobile-repo-card").first()).toBeVisible();
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
