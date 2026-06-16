import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prettier from "prettier";
import YAML from "yaml";

const ROOT = process.cwd();
const DEFAULT_SNAPSHOT = path.join(ROOT, "public", "data", "snapshot.json");
const DEFAULT_CANDIDATES = path.join(ROOT, "public", "data", "candidates.json");
const DEFAULT_HISTORY = path.join(ROOT, "public", "data", "history.json");
const REDFOX_API = "https://redfox.hk/story/web/api";
const GITHUB_API = "https://api.github.com";
const SOURCE_REPO = "redfox-data/redfox-community";
const SOURCE_REPO_URL = `https://github.com/${SOURCE_REPO}`;
export const HISTORY_RETENTION_DAYS = 180;

const FALLBACK_CATEGORY = {
  id: 0,
  code: "redfox_community",
  name: {
    zh: "RedFox Community",
    en: "RedFox Community",
  },
  sortOrder: 999,
};

function nowIso() {
  return new Date().toISOString();
}

function toUtcDate(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return new Date().toISOString().slice(0, 10);
  return new Date(timestamp).toISOString().slice(0, 10);
}

function addUtcDays(date, days) {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return date;
  return new Date(timestamp + days * 86_400_000).toISOString().slice(0, 10);
}

function asFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asString(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function asArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function timeoutSignal(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
}

export function createJsonFetcher({
  token = "",
  timeoutMs = 15_000,
  userAgent = "redfox-skills-ranking",
} = {}) {
  return async function jsonFetch(url) {
    const isGitHub = String(url).startsWith(GITHUB_API);
    const response = await fetch(url, {
      signal: timeoutSignal(timeoutMs),
      headers: {
        Accept: isGitHub ? "application/vnd.github+json" : "application/json",
        "User-Agent": userAgent,
        ...(isGitHub && token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const text = await response.text();
    let body = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: text };
      }
    }

    if (!response.ok) {
      const message = body?.message ?? response.statusText;
      const error = new Error(`HTTP ${response.status}: ${message}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;
  };
}

export function normalizeSkillCode(value) {
  return String(value ?? "")
    .trim()
    .replace(/^skills\//, "")
    .replace(/\/+$/g, "");
}

function normalizeRedfoxDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(" ", "T")}+08:00`
    : raw;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

export function parsePlatformInfo(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => isRecord(item) && item.name)
      .map((item) => {
        const methodValue = asString(item.repo || item.url || item.value);
        return {
          name: asString(item.name),
          value: methodValue,
          ...(methodValue.startsWith("http") ? { url: methodValue } : {}),
        };
      });
  } catch {
    return [];
  }
}

export function displayStatusToBadge(displayStatus) {
  if (Number(displayStatus) === 1) return { zh: "热门", en: "Hot" };
  if (Number(displayStatus) === 2) return { zh: "推荐", en: "Recommended" };
  if (Number(displayStatus) === 3) return { zh: "上新", en: "New" };
  return null;
}

function daysSince(value, referenceIso) {
  const timestamp = Date.parse(value || "");
  const reference = Date.parse(referenceIso || "");
  if (!Number.isFinite(timestamp) || !Number.isFinite(reference)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, Math.floor((reference - timestamp) / 86_400_000));
}

export function calculateHeatScore(skill, generatedAt = nowIso()) {
  const downloads = asFiniteNumber(skill.downloadCount);
  const views = asFiniteNumber(skill.viewCount);
  const status = asFiniteNumber(skill.displayStatus);
  const badgeBoost = { 1: 120, 2: 90, 3: 75 }[status] ?? 0;
  const age = daysSince(skill.updatedAt, generatedAt);
  const recencyBoost = Number.isFinite(age) ? Math.max(0, 30 - age) * 2 : 0;

  return Math.round(
    Math.log(downloads + 1) * 70 +
      Math.log(views + 1) * 20 +
      badgeBoost +
      recencyBoost,
  );
}

function inferAudiencesFromText(skill) {
  const text = [
    skill.skillCode,
    skill.name?.zh,
    skill.name?.en,
    skill.categoryCode,
    skill.categoryName?.zh,
    skill.categoryName?.en,
    skill.description?.zh,
    skill.introduce?.zh,
    ...(skill.tags ?? []),
    ...(skill.accessMethods ?? []).map((method) => method.name),
  ]
    .join(" ")
    .toLowerCase();
  const audiences = [];

  if (/自媒体|创作|内容|文案|rewrite|creator/.test(text))
    audiences.push("media");
  if (/公众号|gzh|wechat/.test(text)) audiences.push("wechat");
  if (/小红书|xiaohongshu|xhs|red/.test(text)) audiences.push("xiaohongshu");
  if (/抖音|douyin|tiktok/.test(text)) audiences.push("douyin");
  if (/数据|榜单|查询|分析|搜索|ranking|search/.test(text))
    audiences.push("data");
  if (/效率|工具|检测|提取|下载|pdf|tool/.test(text))
    audiences.push("productivity");
  if (/skill|api|github|cli|agent|开发/.test(text)) audiences.push("developer");

  return audiences.length ? [...new Set(audiences)] : ["media"];
}

function useCasesForAudiences(audiences) {
  const useCases = [];
  if (audiences.includes("media")) {
    useCases.push({
      zh: "适合自媒体创作者做选题、改写、检测和内容生产。",
      en: "Good for creators doing topics, rewriting, checks, and production.",
    });
  }
  if (audiences.includes("wechat")) {
    useCases.push({
      zh: "适合公众号运营做爆文分析、订阅监控和推文生产。",
      en: "Useful for WeChat article analysis, monitoring, and publishing.",
    });
  }
  if (audiences.includes("xiaohongshu")) {
    useCases.push({
      zh: "适合小红书笔记、账号诊断和种草文案优化。",
      en: "Useful for RED notes, account diagnosis, and copy optimization.",
    });
  }
  if (audiences.includes("douyin")) {
    useCases.push({
      zh: "适合抖音热点、账号、视频作品和搜索数据分析。",
      en: "Useful for Douyin trends, accounts, videos, and search analysis.",
    });
  }
  if (audiences.includes("data")) {
    useCases.push({
      zh: "适合研究热榜、搜索结果、账号数据和内容趋势。",
      en: "Useful for rankings, search results, account data, and content trends.",
    });
  }
  if (audiences.includes("developer")) {
    useCases.push({
      zh: "适合 Agent/CLI 用户直接复用 SKILL.md 与脚本能力。",
      en: "Useful for Agent and CLI users reusing SKILL.md and scripts.",
    });
  }
  return useCases.slice(0, 3);
}

function normalizeCategory(category) {
  return {
    id: asFiniteNumber(category.id, undefined),
    code: asString(category.categoryCode || category.code || "unknown"),
    name: {
      zh: asString(category.categoryName || category.name?.zh || "未分类"),
      en: asString(category.nameEn || category.name?.en || "Uncategorized"),
    },
    sortOrder: asFiniteNumber(category.sortOrder, 999),
  };
}

function sortCategories(categories) {
  return [...categories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
  );
}

async function fetchRedfoxCategories(redfoxFetch) {
  const payload = await redfoxFetch(`${REDFOX_API}/skills/categories`);
  const categories = Array.isArray(payload?.data) ? payload.data : [];
  return sortCategories(categories.map(normalizeCategory));
}

async function fetchRedfoxSkills(redfoxFetch, pageSize = 100) {
  const skills = [];
  let pageNum = 1;
  let totalPages = 1;

  do {
    const url = new URL(`${REDFOX_API}/skills/list`);
    url.searchParams.set("pageNum", String(pageNum));
    url.searchParams.set("pageSize", String(pageSize));
    const payload = await redfoxFetch(url.toString());
    const data = payload?.data ?? {};
    const records = Array.isArray(data.records) ? data.records : [];
    skills.push(...records);
    totalPages = Math.max(1, asFiniteNumber(data.pages, 1));
    pageNum += 1;
  } while (pageNum <= totalPages);

  const seen = new Set();
  return skills.filter((skill) => {
    const code = normalizeSkillCode(skill.skillCode);
    const key = code.toLowerCase();
    if (!code || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseSkillFrontmatter(text) {
  const match = String(text ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  try {
    return YAML.parse(match[1]) ?? {};
  } catch {
    return {};
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

async function fetchGitHubSkillIndex(githubFetch) {
  const payload = await githubFetch(
    `${GITHUB_API}/repos/${SOURCE_REPO}/contents/skills`,
  );
  const dirs = Array.isArray(payload)
    ? payload.filter((item) => item.type === "dir")
    : [];

  const entries = await mapWithConcurrency(dirs, 6, async (item) => {
    const base = {
      skillCode: normalizeSkillCode(item.name),
      githubPath: item.path,
      githubUrl: item.html_url ?? `${SOURCE_REPO_URL}/tree/main/${item.path}`,
      frontmatter: {},
    };

    try {
      const file = await githubFetch(
        `${GITHUB_API}/repos/${SOURCE_REPO}/contents/${item.path}/SKILL.md`,
      );
      const content = asString(file.content).replace(/\s/g, "");
      const text = Buffer.from(content, "base64").toString("utf8");
      return {
        ...base,
        frontmatter: parseSkillFrontmatter(text),
      };
    } catch {
      return base;
    }
  });

  return new Map(
    entries.map((entry) => [entry.skillCode.toLowerCase(), entry]),
  );
}

function githubPathFromUrl(url) {
  const raw = String(url ?? "");
  const marker = "/tree/main/";
  const index = raw.indexOf(marker);
  return index >= 0 ? raw.slice(index + marker.length) : "";
}

function findGithubMethod(accessMethods) {
  return accessMethods.find((method) => method.name.toLowerCase() === "github");
}

function normalizeApiSkill(
  apiSkill,
  categoriesByCode,
  githubIndex,
  generatedAt,
) {
  const skillCode = normalizeSkillCode(apiSkill.skillCode);
  const accessMethods = parsePlatformInfo(apiSkill.platformInfo);
  const githubMethod = findGithubMethod(accessMethods);
  const githubEntry = githubIndex.get(skillCode.toLowerCase());
  const apiCategory = Array.isArray(apiSkill.categories)
    ? apiSkill.categories[0]
    : null;
  const categoryCode = asString(
    apiCategory?.categoryCode ||
      categoriesByCode.get(String(apiSkill.categoryId))?.code ||
      FALLBACK_CATEGORY.code,
  );
  const category = categoriesByCode.get(categoryCode) ?? {
    ...FALLBACK_CATEGORY,
    code: categoryCode,
    name: {
      zh: asString(apiCategory?.categoryName || categoryCode),
      en: asString(apiCategory?.categoryName || categoryCode),
    },
  };
  const githubUrl = githubMethod?.url || githubEntry?.githubUrl || "";
  const githubPath = githubEntry?.githubPath || githubPathFromUrl(githubUrl);
  const updatedAt = normalizeRedfoxDate(apiSkill.updateTime);
  const createdAt = normalizeRedfoxDate(apiSkill.createTime);
  const frontmatter = githubEntry?.frontmatter ?? {};
  const displayBadge = displayStatusToBadge(apiSkill.displayStatus);

  const skill = {
    skillNo: asString(apiSkill.skillNo || skillCode),
    skillCode,
    name: {
      zh: asString(apiSkill.skillName || frontmatter.name || skillCode),
      en: asString(
        apiSkill.nameEn || frontmatter.name || apiSkill.skillName || skillCode,
      ),
    },
    description: {
      zh: asString(
        apiSkill.description ||
          frontmatter.description ||
          apiSkill.introduce ||
          "",
      ),
      en: asString(
        apiSkill.description ||
          frontmatter.description ||
          apiSkill.introduceEn ||
          "",
      ),
    },
    introduce: {
      zh: asString(
        apiSkill.introduce ||
          apiSkill.description ||
          frontmatter.description ||
          "",
      ),
      en: asString(
        apiSkill.introduceEn ||
          apiSkill.description ||
          frontmatter.description ||
          "",
      ),
    },
    readme: {
      zh: asString(apiSkill.readme),
      en: asString(apiSkill.readmeEn || apiSkill.readme),
    },
    categoryCode: category.code,
    categoryName: category.name,
    categories: Array.isArray(apiSkill.categories)
      ? apiSkill.categories.map((item) =>
          normalizeCategory({
            categoryCode: item.categoryCode,
            categoryName: item.categoryName,
            nameEn:
              categoriesByCode.get(item.categoryCode)?.name.en ||
              item.categoryName,
            sortOrder:
              categoriesByCode.get(item.categoryCode)?.sortOrder ?? 999,
          }),
        )
      : [category],
    tags: asArray(apiSkill.tags),
    icon: asString(apiSkill.icon),
    iconUrl: asString(apiSkill.iconUrl),
    price: asFiniteNumber(apiSkill.price),
    usageCount: asFiniteNumber(apiSkill.usageCount),
    viewCount: asFiniteNumber(apiSkill.viewCount),
    downloadCount: asFiniteNumber(apiSkill.downloadCount),
    displayStatus: asFiniteNumber(apiSkill.displayStatus),
    displayBadge,
    status: asFiniteNumber(apiSkill.status),
    hasApiKey: Boolean(apiSkill.hasApiKey),
    platformInfoRaw: asString(apiSkill.platformInfo),
    accessMethods,
    redfoxUrl: `https://redfox.hk/skills/no/${apiSkill.skillNo}`,
    githubUrl,
    githubPath,
    heatScore: 0,
    rank: 0,
    rankByCategory: 0,
    createdAt,
    updatedAt,
    lastFetchedAt: generatedAt,
    fetchStatus: "ok",
    downloadGrowth7d: null,
    downloadGrowth30d: null,
    rankDelta7d: null,
    rankDelta30d: null,
    trendStatus: "collecting",
    audiences: [],
    useCases: [],
  };

  skill.heatScore = calculateHeatScore(skill, generatedAt);
  skill.audiences = inferAudiencesFromText(skill);
  skill.useCases = useCasesForAudiences(skill.audiences);
  return skill;
}

function addRanks(skills) {
  const sorted = [...skills].sort(
    (a, b) =>
      b.heatScore - a.heatScore ||
      b.downloadCount - a.downloadCount ||
      Date.parse(b.updatedAt || "0") - Date.parse(a.updatedAt || "0") ||
      a.skillCode.localeCompare(b.skillCode),
  );
  const globalRanks = new Map(
    sorted.map((skill, index) => [skill.skillCode, index + 1]),
  );
  const categoryRanks = new Map();

  for (const categoryCode of [
    ...new Set(skills.map((skill) => skill.categoryCode)),
  ]) {
    sorted
      .filter((skill) => skill.categoryCode === categoryCode)
      .forEach((skill, index) => categoryRanks.set(skill.skillCode, index + 1));
  }

  return sorted.map((skill) => ({
    ...skill,
    rank: globalRanks.get(skill.skillCode) ?? 0,
    rankByCategory: categoryRanks.get(skill.skillCode) ?? 0,
  }));
}

function buildCategoriesByCode(categories) {
  const map = new Map();
  for (const category of categories) {
    map.set(category.code, category);
    if (category.id !== undefined) map.set(String(category.id), category);
  }
  return map;
}

function isV2Snapshot(snapshot) {
  return snapshot?.schemaVersion === 2 && Array.isArray(snapshot?.skills);
}

function markPreviousSnapshotFallback(previousSnapshot, error, generatedAt) {
  return {
    ...previousSnapshot,
    generatedAt,
    source: "redfox-api-fallback",
    errorMessage:
      error?.message ?? "RedFox API unavailable; reused previous snapshot.",
    skills: previousSnapshot.skills.map((skill) => ({
      ...skill,
      fetchStatus: "fallback",
      errorMessage:
        error?.message ?? "RedFox API unavailable; reused previous snapshot.",
      lastFetchedAt: generatedAt,
    })),
  };
}

function buildGitHubFallbackSnapshot(githubIndex, generatedAt, error) {
  const categories = [FALLBACK_CATEGORY];
  const skills = addRanks(
    [...githubIndex.values()].map((entry) => {
      const description = asString(entry.frontmatter?.description);
      const skill = {
        skillNo: entry.skillCode,
        skillCode: entry.skillCode,
        name: {
          zh: asString(entry.frontmatter?.name || entry.skillCode),
          en: asString(entry.frontmatter?.name || entry.skillCode),
        },
        description: { zh: description, en: description },
        introduce: { zh: description, en: description },
        readme: { zh: "", en: "" },
        categoryCode: FALLBACK_CATEGORY.code,
        categoryName: FALLBACK_CATEGORY.name,
        categories,
        tags: [],
        icon: "",
        iconUrl: "",
        price: 0,
        usageCount: 0,
        viewCount: 0,
        downloadCount: 0,
        displayStatus: 0,
        displayBadge: null,
        status: 1,
        hasApiKey: /REDFOX_API_KEY/.test(description),
        platformInfoRaw: "",
        accessMethods: [
          {
            name: "github",
            value: entry.githubUrl,
            url: entry.githubUrl,
          },
          {
            name: "skills-cli",
            value: SOURCE_REPO,
          },
        ],
        redfoxUrl: "https://redfox.hk/skills",
        githubUrl: entry.githubUrl,
        githubPath: entry.githubPath,
        heatScore: 0,
        rank: 0,
        rankByCategory: 0,
        createdAt: "",
        updatedAt: "",
        lastFetchedAt: generatedAt,
        fetchStatus: "error",
        errorMessage:
          error?.message ??
          "RedFox API unavailable; generated GitHub fallback catalog.",
        downloadGrowth7d: null,
        downloadGrowth30d: null,
        rankDelta7d: null,
        rankDelta30d: null,
        trendStatus: "collecting",
        audiences: ["developer"],
        useCases: [
          {
            zh: "RedFox API 不可用时的 GitHub 开源目录兜底。",
            en: "GitHub fallback catalog when the RedFox API is unavailable.",
          },
        ],
      };
      return skill;
    }),
  );

  return {
    schemaVersion: 2,
    generatedAt,
    source: "github-fallback",
    categories,
    skills,
    sourceRepo: {
      fullName: SOURCE_REPO,
      htmlUrl: SOURCE_REPO_URL,
    },
    errorMessage: error?.message,
  };
}

export async function buildSnapshot({
  redfoxFetch = createJsonFetcher(),
  githubFetch = createJsonFetcher({ token: process.env.GITHUB_TOKEN }),
  previousSnapshot = null,
} = {}) {
  const generatedAt = nowIso();
  let githubIndex = new Map();

  try {
    githubIndex = await fetchGitHubSkillIndex(githubFetch);
  } catch (error) {
    console.warn(
      `GitHub skill index unavailable; continuing with RedFox API only. ${error?.message ?? ""}`,
    );
  }

  try {
    const categories = await fetchRedfoxCategories(redfoxFetch);
    const categoryList = categories.length ? categories : [FALLBACK_CATEGORY];
    const categoriesByCode = buildCategoriesByCode(categoryList);
    const apiSkills = await fetchRedfoxSkills(redfoxFetch);
    const skills = addRanks(
      apiSkills.map((skill) =>
        normalizeApiSkill(skill, categoriesByCode, githubIndex, generatedAt),
      ),
    );

    return {
      schemaVersion: 2,
      generatedAt,
      source: "redfox-api+github",
      categories: categoryList,
      skills,
      sourceRepo: {
        fullName: SOURCE_REPO,
        htmlUrl: SOURCE_REPO_URL,
      },
    };
  } catch (error) {
    if (isV2Snapshot(previousSnapshot) && previousSnapshot.skills.length > 0) {
      return markPreviousSnapshotFallback(previousSnapshot, error, generatedAt);
    }
    return buildGitHubFallbackSnapshot(githubIndex, generatedAt, error);
  }
}

export function buildCandidates(generatedAt = nowIso()) {
  return {
    generatedAt,
    source: "redfox-skills",
    candidates: [],
  };
}

function byDate(a, b) {
  return a.date.localeCompare(b.date);
}

function normalizeHistory(history, retentionDays = HISTORY_RETENTION_DAYS) {
  if (history?.schemaVersion !== 2 || !Array.isArray(history.skills)) {
    return {
      schemaVersion: 2,
      generatedAt: String(history?.generatedAt ?? nowIso()),
      retentionDays,
      skills: [],
    };
  }

  return {
    schemaVersion: 2,
    generatedAt: String(history.generatedAt ?? nowIso()),
    retentionDays,
    skills: history.skills
      .filter((skillHistory) => skillHistory?.skillCode)
      .map((skillHistory) => ({
        skillCode: normalizeSkillCode(skillHistory.skillCode),
        samples: Array.isArray(skillHistory.samples)
          ? skillHistory.samples
              .filter((sample) => sample?.date)
              .map((sample) => ({
                date: String(sample.date).slice(0, 10),
                downloadCount: asFiniteNumber(sample.downloadCount),
                viewCount: asFiniteNumber(sample.viewCount),
                heatScore: asFiniteNumber(sample.heatScore),
                rank: asFiniteNumber(sample.rank),
                rankByCategory: asFiniteNumber(sample.rankByCategory),
              }))
              .sort(byDate)
          : [],
      }))
      .filter((skillHistory) => skillHistory.samples.length > 0),
  };
}

export function mergeHistoryPayloads(
  histories,
  retentionDays = HISTORY_RETENTION_DAYS,
) {
  const normalizedHistories = histories
    .filter(Boolean)
    .map((history) =>
      normalizeHistory(history, history?.retentionDays ?? retentionDays),
    )
    .filter((history) => history.skills.length > 0);
  const generatedAt =
    normalizedHistories
      .map((history) => history.generatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? nowIso();
  const historyBySkill = new Map();

  for (const history of normalizedHistories) {
    for (const skillHistory of history.skills) {
      const key = skillHistory.skillCode.toLowerCase();
      const existing = historyBySkill.get(key) ?? {
        skillCode: skillHistory.skillCode,
        samples: new Map(),
      };
      for (const sample of skillHistory.samples) {
        existing.samples.set(sample.date, sample);
      }
      historyBySkill.set(key, existing);
    }
  }

  return {
    schemaVersion: 2,
    generatedAt,
    retentionDays,
    skills: [...historyBySkill.values()]
      .map((skillHistory) => ({
        skillCode: skillHistory.skillCode,
        samples: [...skillHistory.samples.values()].sort(byDate),
      }))
      .sort((a, b) => a.skillCode.localeCompare(b.skillCode)),
  };
}

function createSampleFromSkill(skill, generatedAt) {
  return {
    date: toUtcDate(generatedAt),
    downloadCount: asFiniteNumber(skill.downloadCount),
    viewCount: asFiniteNumber(skill.viewCount),
    heatScore: asFiniteNumber(skill.heatScore),
    rank: asFiniteNumber(skill.rank),
    rankByCategory: asFiniteNumber(skill.rankByCategory),
  };
}

function isReliableHistorySkill(skill) {
  return skill?.fetchStatus === "ok";
}

export function createHistoryFromSnapshot(
  snapshot,
  retentionDays = HISTORY_RETENTION_DAYS,
) {
  const generatedAt = snapshot?.generatedAt ?? nowIso();
  const skills = isV2Snapshot(snapshot) ? snapshot.skills : [];

  return normalizeHistory(
    {
      schemaVersion: 2,
      generatedAt,
      retentionDays,
      skills: skills
        .filter((skill) => skill?.skillCode && isReliableHistorySkill(skill))
        .map((skill) => ({
          skillCode: normalizeSkillCode(skill.skillCode),
          samples: [createSampleFromSkill(skill, generatedAt)],
        })),
    },
    retentionDays,
  );
}

function findSampleAtOrBefore(samples, targetDate) {
  return [...samples]
    .filter((sample) => sample.date <= targetDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function buildTrendMetric(skill, history, generatedAt, days) {
  const currentDate = toUtcDate(generatedAt);
  const targetDate = addUtcDays(currentDate, -days);
  const previous = findSampleAtOrBefore(history?.samples ?? [], targetDate);

  if (!previous || !isReliableHistorySkill(skill)) {
    return {
      growth: null,
      rankDelta: null,
    };
  }

  return {
    growth: asFiniteNumber(skill.downloadCount) - previous.downloadCount,
    rankDelta: previous.rank - asFiniteNumber(skill.rank),
  };
}

export function addTrendMetricsToSnapshot(snapshot, history) {
  const normalizedHistory = normalizeHistory(
    history,
    history?.retentionDays ?? HISTORY_RETENTION_DAYS,
  );
  const historyBySkill = new Map(
    normalizedHistory.skills.map((skillHistory) => [
      skillHistory.skillCode.toLowerCase(),
      skillHistory,
    ]),
  );
  const generatedAt = snapshot?.generatedAt ?? nowIso();

  return {
    ...snapshot,
    generatedAt,
    skills: (snapshot?.skills ?? []).map((skill) => {
      const skillHistory = historyBySkill.get(skill.skillCode.toLowerCase());
      const sevenDay = buildTrendMetric(skill, skillHistory, generatedAt, 7);
      const thirtyDay = buildTrendMetric(skill, skillHistory, generatedAt, 30);
      const trendStatus =
        sevenDay.growth === null || thirtyDay.growth === null
          ? "collecting"
          : "ready";

      return {
        ...skill,
        downloadGrowth7d: sevenDay.growth,
        downloadGrowth30d: thirtyDay.growth,
        rankDelta7d: sevenDay.rankDelta,
        rankDelta30d: thirtyDay.rankDelta,
        trendStatus,
      };
    }),
  };
}

export function mergeSnapshotIntoHistory(
  history,
  snapshot,
  retentionDays = HISTORY_RETENTION_DAYS,
) {
  const normalizedHistory = normalizeHistory(history, retentionDays);
  const generatedAt = snapshot?.generatedAt ?? nowIso();
  const currentDate = toUtcDate(generatedAt);
  const cutoffDate = addUtcDays(currentDate, -(retentionDays - 1));
  const historyBySkill = new Map(
    normalizedHistory.skills.map((skillHistory) => [
      skillHistory.skillCode.toLowerCase(),
      {
        skillCode: skillHistory.skillCode,
        samples: new Map(
          skillHistory.samples
            .filter((sample) => sample.date >= cutoffDate)
            .map((sample) => [sample.date, sample]),
        ),
      },
    ]),
  );

  for (const skill of snapshot?.skills ?? []) {
    if (!skill?.skillCode || !isReliableHistorySkill(skill)) continue;

    const key = normalizeSkillCode(skill.skillCode).toLowerCase();
    const skillHistory = historyBySkill.get(key) ?? {
      skillCode: normalizeSkillCode(skill.skillCode),
      samples: new Map(),
    };
    skillHistory.samples.set(
      currentDate,
      createSampleFromSkill(skill, generatedAt),
    );
    historyBySkill.set(key, skillHistory);
  }

  return {
    schemaVersion: 2,
    generatedAt,
    retentionDays,
    skills: [...historyBySkill.values()]
      .map((skillHistory) => ({
        skillCode: skillHistory.skillCode,
        samples: [...skillHistory.samples.values()]
          .filter((sample) => sample.date >= cutoffDate)
          .sort(byDate),
      }))
      .filter((skillHistory) => skillHistory.samples.length > 0)
      .sort((a, b) => a.skillCode.localeCompare(b.skillCode)),
  };
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const formatted = await prettier.format(JSON.stringify(value), {
    parser: "json",
  });
  await fs.writeFile(`${filePath}.tmp`, formatted);
  await fs.rename(`${filePath}.tmp`, filePath);
}

async function readJsonIfExists(filePath) {
  if (!filePath) return null;
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readHistory(historyPath, deployedHistoryPath) {
  const committedHistory = await readJsonIfExists(historyPath);
  const deployedHistory = await readJsonIfExists(deployedHistoryPath);
  return mergeHistoryPayloads([committedHistory, deployedHistory]);
}

export async function updateData({
  snapshotPath = DEFAULT_SNAPSHOT,
  candidatesPath = DEFAULT_CANDIDATES,
  historyPath = DEFAULT_HISTORY,
  deployedHistoryPath = process.env.DEPLOYED_HISTORY_PATH,
  redfoxFetch = createJsonFetcher(),
  githubFetch = createJsonFetcher({ token: process.env.GITHUB_TOKEN }),
} = {}) {
  const previousSnapshot = await readJsonIfExists(snapshotPath);
  const previousHistory = await readHistory(historyPath, deployedHistoryPath);
  const snapshot = await buildSnapshot({
    redfoxFetch,
    githubFetch,
    previousSnapshot,
  });
  const snapshotWithTrends = addTrendMetricsToSnapshot(
    snapshot,
    previousHistory,
  );
  const history = mergeSnapshotIntoHistory(
    previousHistory,
    snapshotWithTrends,
    HISTORY_RETENTION_DAYS,
  );
  const candidates = buildCandidates(snapshotWithTrends.generatedAt);

  await writeJson(snapshotPath, snapshotWithTrends);
  await writeJson(candidatesPath, candidates);
  await writeJson(historyPath, history);

  return {
    snapshot: snapshotWithTrends,
    candidates,
    history,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  updateData()
    .then(({ snapshot, history }) => {
      console.log(
        `Updated ${snapshot.skills.length} RedFox skills and ${history.skills.length} history timelines.`,
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
