import { expect, type Page, test } from "@playwright/test";

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
      readmeSnippetZh: "# 中文写作 Skill",
      readmeSnippetEn: "# Chinese Writing Skill",
      categoryCode: "content",
      categoryName: { zh: "内容创作", en: "Content Creation" },
      tags: ["写作", "中文"],
      audiences: ["media", "writing"],
      useCases: [
        {
          zh: "适合自媒体创作者做选题、改写和长文生产。",
          en: "Good for creator writing workflows.",
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

function skillPattern(skill: string) {
  return new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function getSkillCard(page: Page, skill: string) {
  return page
    .locator(".ranking-item", { hasText: skillPattern(skill) })
    .first();
}

test.beforeEach(async ({ page }) => {
  await page.route("**/data/snapshot.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(snapshot),
    });
  });
});

test("renders the GitHub skills gallery and filters skills", async ({
  page,
}) => {
  await page.goto("/?lang=en");

  await expect(
    page.getByRole("heading", { name: "Agent Skills Radar" }),
  ).toBeVisible();
  await expect(page.getByText("Today Top Skill")).toBeVisible();
  await expect(page.getByText("Scenario quick start")).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Ranking list/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Media creators", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Advanced filters/i }).click();
  await expect(
    page.getByRole("button", { name: /7-day star growth/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Close/i }).click();
  await expect(getSkillCard(page, "content-skill")).toBeVisible();

  await page
    .getByPlaceholder("Search skills, tags, repos, or use cases")
    .fill("research");
  await expect(getSkillCard(page, "research-skill")).toBeVisible();
  await expect(page).toHaveURL(/q=research/);

  await page
    .getByRole("combobox", { name: /Sort/i })
    .selectOption("radarScore");
  await expect(page).toHaveURL(/sort=radarScore/);
});

test("opens trend spotlights and keeps details available", async ({ page }) => {
  await page.goto("/?lang=en");

  await page.getByRole("button", { name: /Fastest growth/i }).click();
  await expect(page).toHaveURL(/spotlight=growth7d/);
  await expect(getSkillCard(page, "content-skill")).toBeVisible();

  await getSkillCard(page, "content-skill")
    .getByRole("button", {
      name: /View details/i,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "content-skill" }),
  ).toBeVisible();
});

test("opens details with GitHub actions and skill paths", async ({ page }) => {
  await page.goto("/?lang=en");
  await getSkillCard(page, "content-skill")
    .getByRole("button", {
      name: /View details/i,
    })
    .click();

  const drawer = page.getByRole("dialog", {
    name: "content-skill",
  });

  await expect(
    drawer.getByRole("link", { name: /Open GitHub/i }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: /Open homepage/i }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: /Copy skill link/i }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: /Save this skill/i }),
  ).toBeVisible();
  await expect(drawer.getByText("skills/writing/SKILL.md")).toBeVisible();
});

test("persists quick filters, favorites, and detail drawers in the URL", async ({
  page,
}) => {
  await page.goto("/?lang=en");

  await page
    .getByRole("button", { name: "Media creators", exact: true })
    .click();
  await expect(page).toHaveURL(/audience=media/);

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

  await page.goto("/?lang=en&skill=owner%2Fcontent-skill");
  await expect(
    page.getByRole("dialog", { name: "content-skill" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Use cases" })).toBeVisible();
});

test("keeps the mobile skills layout within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?lang=en");
  await expect(getSkillCard(page, "content-skill")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
