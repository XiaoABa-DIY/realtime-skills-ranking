import { expect, type Page, test } from "@playwright/test";

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
    {
      id: 4,
      code: "data_query",
      name: { zh: "数据查询", en: "Data Query" },
      sortOrder: 3,
    },
  ],
  skills: [
    {
      skillNo: "wn2Hrw42",
      skillCode: "multi-wordcheck",
      name: { zh: "多平台违禁词检测", en: "Multi-Platform Word Check" },
      description: { zh: "违禁词检测", en: "Prohibited word check" },
      introduce: {
        zh: "覆盖公众号、小红书、抖音的违禁词检测。",
        en: "Compliance checks for WeChat, Xiaohongshu, and Douyin.",
      },
      readme: { zh: "# 多平台违禁词检测", en: "# Multi-Platform Word Check" },
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
        { zh: "适合内容合规检查。", en: "Useful for compliance checks." },
      ],
    },
    {
      skillNo: "abc",
      skillCode: "douyin-search",
      name: { zh: "抖音作品查询", en: "Douyin Work Search" },
      description: { zh: "查询抖音作品", en: "Search Douyin works" },
      introduce: {
        zh: "查询抖音作品数据和内容表现。",
        en: "Search Douyin work data and performance.",
      },
      readme: { zh: "# 抖音作品查询", en: "# Douyin Work Search" },
      categoryCode: "data_query",
      categoryName: { zh: "数据查询", en: "Data Query" },
      categories: [],
      tags: ["抖音", "数据查询"],
      icon: "",
      iconUrl: "",
      price: 0,
      usageCount: 0,
      viewCount: 1000,
      downloadCount: 500,
      displayStatus: 0,
      displayBadge: null,
      status: 1,
      hasApiKey: true,
      platformInfoRaw: "",
      accessMethods: [],
      redfoxUrl: "https://redfox.hk/skills/no/abc",
      githubUrl: "",
      githubPath: "",
      heatScore: 900,
      rank: 2,
      rankByCategory: 1,
      createdAt: "2026-05-28T12:27:54.000Z",
      updatedAt: "2026-06-15T02:08:20.000Z",
      lastFetchedAt: "2026-06-16T02:00:00.000Z",
      fetchStatus: "ok",
      downloadGrowth7d: null,
      downloadGrowth30d: null,
      rankDelta7d: null,
      rankDelta30d: null,
      trendStatus: "collecting",
      audiences: ["douyin", "data"],
      useCases: [
        { zh: "适合抖音数据分析。", en: "Useful for Douyin analysis." },
      ],
    },
  ],
};

function skillPattern(skill: string) {
  return new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

function getSkillCard(page: Page, skill: string) {
  return page.locator(".skill-card", { hasText: skillPattern(skill) }).first();
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

test("renders the RedFox skills gallery and filters skills", async ({
  page,
}) => {
  await page.goto("/?lang=en");

  await expect(
    page.getByRole("heading", { name: "RedFox Skills Heat Ranking" }),
  ).toBeVisible();
  await expect(page.getByText("Top 3 by heat")).toBeVisible();
  await expect(page.getByText("Today picks")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Media creators", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /7-day usage growth/i }),
  ).toBeVisible();
  await expect(getSkillCard(page, "Multi-Platform Word Check")).toBeVisible();

  await page
    .getByPlaceholder("Search skills, tags, platforms, or use cases")
    .fill("Douyin");
  await expect(getSkillCard(page, "Douyin Work Search")).toBeVisible();
  await expect(page).toHaveURL(/q=Douyin/);
});

test("opens trend spotlights and keeps details available", async ({ page }) => {
  await page.goto("/?lang=en");

  await page.getByRole("button", { name: /7-day usage growth/i }).click();
  await expect(page).toHaveURL(/spotlight=growth7d/);
  await expect(getSkillCard(page, "Multi-Platform Word Check")).toBeVisible();

  await getSkillCard(page, "Multi-Platform Word Check")
    .getByRole("button", {
      name: /View details/i,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Multi-Platform Word Check" }),
  ).toBeVisible();
});

test("opens details with RedFox/GitHub actions", async ({ page }) => {
  await page.goto("/?lang=en");
  await getSkillCard(page, "Multi-Platform Word Check")
    .getByRole("button", {
      name: /View details/i,
    })
    .click();

  const drawer = page.getByRole("dialog", {
    name: "Multi-Platform Word Check",
  });

  await expect(
    drawer.getByRole("link", { name: /Open RedFox/i }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("link", { name: /Open GitHub/i }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: /Copy skill link/i }),
  ).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: /Save this skill/i }),
  ).toBeVisible();
});

test("persists quick filters, favorites, and detail drawers in the URL", async ({
  page,
}) => {
  await page.goto("/?lang=en");

  await page.getByRole("button", { name: "Douyin", exact: true }).click();
  await expect(page).toHaveURL(/audience=douyin/);

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

  await page.goto("/?lang=en&skill=multi-wordcheck");
  await expect(
    page.getByRole("dialog", { name: "Multi-Platform Word Check" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Use cases" })).toBeVisible();
});

test("keeps the mobile skills layout within the viewport", async ({ page }) => {
  await page.goto("/?lang=en");
  await expect(getSkillCard(page, "Multi-Platform Word Check")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
