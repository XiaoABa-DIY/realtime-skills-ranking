import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prettier from "prettier";
import YAML from "yaml";
import {
  classifyEcosystem,
  calculateEcosystemScores,
  computeEcosystemBreakdown,
  countTotalEcosystemSources,
  fetchAnthropicSkills,
  fetchCommitActivity,
  fetchReleaseData,
  fetchContributors,
  fetchHnMentions,
  fetchHfMetrics,
} from "./ecosystem-enrich.mjs";

const ROOT = process.cwd();
const DEFAULT_SKILLS = path.join(ROOT, "data", "skills.yml");
const DEFAULT_DISCOVERY = path.join(ROOT, "data", "discovery-queries.yml");
const DEFAULT_SNAPSHOT = path.join(ROOT, "public", "data", "snapshot.json");
const DEFAULT_CANDIDATES = path.join(ROOT, "public", "data", "candidates.json");
const DEFAULT_HISTORY = path.join(ROOT, "public", "data", "history.json");
const GITHUB_API = "https://api.github.com";
export const HISTORY_RETENTION_DAYS = 180;

const CATEGORY_DEFINITIONS = [
  { code: "content", zh: "内容创作", en: "Content Creation", sortOrder: 1 },
  { code: "developer", zh: "编程开发", en: "Developer Skills", sortOrder: 2 },
  {
    code: "prompt-workflow",
    zh: "提示词/工作流",
    en: "Prompt & Workflow",
    sortOrder: 3,
  },
  {
    code: "design-media",
    zh: "设计与多媒体",
    en: "Design & Media",
    sortOrder: 4,
  },
  { code: "data", zh: "数据研究", en: "Data Research", sortOrder: 5 },
  { code: "productivity", zh: "效率办公", en: "Productivity", sortOrder: 6 },
  {
    code: "docs-knowledge",
    zh: "文档知识库",
    en: "Docs & Knowledge",
    sortOrder: 7,
  },
  {
    code: "chinese-localization",
    zh: "中文本地化",
    en: "Chinese Localization",
    sortOrder: 8,
  },
];

const CATEGORY_ALIASES = new Map(
  CATEGORY_DEFINITIONS.flatMap((category) => [
    [category.code.toLowerCase(), category],
    [category.zh.toLowerCase(), category],
    [category.en.toLowerCase(), category],
  ]),
);

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

function timeoutSignal(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
}

function hasChinese(text) {
  return /[\u3400-\u9fff]/.test(String(text ?? ""));
}

function countChinese(text) {
  return (String(text ?? "").match(/[\u3400-\u9fff]/g) ?? []).length;
}

export function calculateChineseScore(...parts) {
  const text = parts.filter(Boolean).join("\n");
  if (!text) return 0;
  const chineseChars = countChinese(text);
  const ratio = chineseChars / Math.max(text.length, 1);
  return Math.min(100, Math.round(chineseChars * 1.8 + ratio * 80));
}

export function normalizeRepoName(value) {
  let repo = String(value ?? "").trim();
  repo = repo.replace(/^https?:\/\/github\.com\//i, "");
  repo = repo.replace(/^git@github\.com:/i, "");
  repo = repo.replace(/\.git$/i, "");
  repo = repo.replace(/^\/+|\/+$/g, "");
  const [owner, name] = repo.split("/");
  return owner && name ? `${owner}/${name}` : repo;
}

export function isAcceptedSkillPath(value) {
  const skillPath = String(value ?? "").replace(/\\/g, "/");
  return (
    /^SKILL\.md$/i.test(skillPath) ||
    /^skills\/.+\/SKILL\.md$/i.test(skillPath) ||
    /\/skills\/.+\/SKILL\.md$/i.test(skillPath)
  );
}

export function createJsonFetcher({
  token = "",
  timeoutMs = 20_000,
  userAgent = "github-skills-ranking",
} = {}) {
  return async function jsonFetch(url) {
    const response = await fetch(url, {
      signal: timeoutSignal(timeoutMs),
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": userAgent,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

function decodeGitHubContent(payload) {
  const raw = asString(payload?.content).replace(/\s/g, "");
  if (!raw) return "";
  return Buffer.from(raw, "base64").toString("utf8");
}

function frontmatter(text) {
  const match = String(text ?? "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  try {
    return YAML.parse(match[1]) ?? {};
  } catch {
    return {};
  }
}

function truncateText(text, maxLength = 900) {
  const normalized = String(text ?? "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}

function categoryFrom(value, fallbackText = "") {
  const key = String(value ?? "")
    .trim()
    .toLowerCase();
  if (CATEGORY_ALIASES.has(key)) return CATEGORY_ALIASES.get(key);
  const text = `${value} ${fallbackText}`.toLowerCase();
  if (/设计|image|media|figma|ui|ux|visual|design/.test(text)) {
    return CATEGORY_ALIASES.get("design-media");
  }
  if (/数据|研究|search|research|rag|analysis|分析/.test(text)) {
    return CATEGORY_ALIASES.get("data");
  }
  if (/代码|编程|developer|coding|code|review/.test(text)) {
    return CATEGORY_ALIASES.get("developer");
  }
  if (/prompt|workflow|提示|工作流/.test(text)) {
    return CATEGORY_ALIASES.get("prompt-workflow");
  }
  if (/文档|知识|docs|knowledge|readme/.test(text)) {
    return CATEGORY_ALIASES.get("docs-knowledge");
  }
  if (/中文|localization|translation|cn|chinese/.test(text)) {
    return CATEGORY_ALIASES.get("chinese-localization");
  }
  if (/效率|office|pdf|productivity|tool/.test(text)) {
    return CATEGORY_ALIASES.get("productivity");
  }
  return CATEGORY_ALIASES.get("content");
}

function categoryPayload(category) {
  return {
    code: category.code,
    name: {
      zh: category.zh,
      en: category.en,
    },
    sortOrder: category.sortOrder,
  };
}

function normalizeAudience(value) {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  const aliases = {
    自媒体: "media",
    media: "media",
    creator: "media",
    creators: "media",
    程序员: "developer",
    developer: "developer",
    developers: "developer",
    写作: "writing",
    writing: "writing",
    prompt: "writing",
    设计: "design",
    design: "design",
    数据: "data",
    data: "data",
    research: "data",
    效率: "productivity",
    productivity: "productivity",
    beginner: "beginner",
    入门: "beginner",
  };
  return aliases[text] ?? "";
}

function inferAudiences(input, text) {
  const explicit = asArray(input?.audiences)
    .map(normalizeAudience)
    .filter(Boolean);
  if (explicit.length) return [...new Set(explicit)];

  const lower = String(text ?? "").toLowerCase();
  const audiences = [];
  if (/自媒体|公众号|小红书|抖音|creator|content/.test(lower)) {
    audiences.push("media");
  }
  if (/代码|编程|developer|coding|code|codex|cli/.test(lower)) {
    audiences.push("developer");
  }
  if (/写作|提示词|prompt|rewrite|article|report/.test(lower)) {
    audiences.push("writing");
  }
  if (/设计|视觉|图片|image|design|figma|ui|ux/.test(lower)) {
    audiences.push("design");
  }
  if (/数据|研究|search|research|rag|analysis|分析/.test(lower)) {
    audiences.push("data");
  }
  if (/效率|办公|pdf|doc|tool|productivity/.test(lower)) {
    audiences.push("productivity");
  }
  if (/入门|教程|中文|guide|tutorial|learn/.test(lower)) {
    audiences.push("beginner");
  }
  return audiences.length ? [...new Set(audiences)] : ["beginner"];
}

function useCasesForAudiences(audiences) {
  const useCases = [];
  if (audiences.includes("media")) {
    useCases.push({
      zh: "适合自媒体创作者做选题、改写、素材整理和跨平台内容生产。",
      en: "Good for creators doing topics, rewriting, assets, and publishing.",
    });
  }
  if (audiences.includes("developer")) {
    useCases.push({
      zh: "适合程序员把 SKILL.md 固化成可复用开发流程。",
      en: "Useful for developers turning SKILL.md into reusable workflows.",
    });
  }
  if (audiences.includes("writing")) {
    useCases.push({
      zh: "适合提示词、文章、报告和结构化写作。",
      en: "Useful for prompts, articles, reports, and structured writing.",
    });
  }
  if (audiences.includes("data")) {
    useCases.push({
      zh: "适合资料研究、数据分析、搜索结果整理和报告生成。",
      en: "Useful for research, analysis, search synthesis, and reports.",
    });
  }
  if (audiences.includes("productivity")) {
    useCases.push({
      zh: "适合文档处理、批量转换和日常办公提效。",
      en: "Useful for document handling, batch conversion, and productivity.",
    });
  }
  return useCases.slice(0, 3);
}

function isExcludedRepo(repo, text = "") {
  const lower =
    `${repo?.full_name ?? ""} ${repo?.description ?? ""} ${(repo?.topics ?? []).join(" ")} ${text}`.toLowerCase();
  if (
    /\bmcp\b|modelcontextprotocol|model-context-protocol|mcp-server/.test(lower)
  ) {
    return true;
  }
  if (
    /agent framework|multi-agent framework|agent orchestration framework|autonomous agent framework/.test(
      lower,
    )
  ) {
    return true;
  }
  return false;
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

async function fetchRepo(githubFetch, repo) {
  return githubFetch(`${GITHUB_API}/repos/${repo}`);
}

async function fetchSkillPaths(githubFetch, repo, branch) {
  const payload = await githubFetch(
    `${GITHUB_API}/repos/${repo}/git/trees/${branch}?recursive=1`,
  );
  const tree = Array.isArray(payload?.tree) ? payload.tree : [];
  return tree
    .filter((item) => item?.type === "blob" && isAcceptedSkillPath(item.path))
    .map((item) => item.path)
    .sort();
}

async function fetchReadme(githubFetch, repo) {
  try {
    const payload = await githubFetch(`${GITHUB_API}/repos/${repo}/readme`);
    return decodeGitHubContent(payload);
  } catch {
    return "";
  }
}

async function fetchContent(githubFetch, repo, filePath) {
  try {
    const encodedPath = encodeURIComponent(filePath);
    const payload = await githubFetch(
      `${GITHUB_API}/repos/${repo}/contents/${encodedPath}`,
    );
    return decodeGitHubContent(payload);
  } catch {
    return "";
  }
}

function repoLicense(repo) {
  return asString(repo?.license?.spdx_id || repo?.license?.name);
}

function buildDescription(input, repo, readme, skillText) {
  const summary = input?.summary ?? {};
  const repoDescription = asString(repo?.description);
  const fallbackZh = hasChinese(repoDescription)
    ? repoDescription
    : hasChinese(readme)
      ? truncateText(readme, 220)
      : hasChinese(skillText)
        ? truncateText(skillText, 220)
        : repoDescription;

  return {
    zh: asString(summary.zh || fallbackZh || repoDescription),
    en: asString(summary.en || repoDescription || summary.zh || fallbackZh),
  };
}

async function buildSkillSnapshot(input, githubFetch, generatedAt) {
  const repoName = normalizeRepoName(input.repo);
  try {
    const repo = await fetchRepo(githubFetch, repoName);
    if (repo.archived || repo.disabled) {
      throw new Error("Repository is archived or disabled.");
    }
    const defaultBranch = asString(repo.default_branch, "main");
    const skillMdPaths = await fetchSkillPaths(
      githubFetch,
      repoName,
      defaultBranch,
    );
    if (skillMdPaths.length === 0) {
      throw new Error("No accepted SKILL.md file found.");
    }

    const readme = await fetchReadme(githubFetch, repoName);
    const firstSkillText = await fetchContent(
      githubFetch,
      repoName,
      skillMdPaths[0],
    );
    const fm = frontmatter(firstSkillText);
    const description = buildDescription(input, repo, readme, firstSkillText);
    const combinedText = [
      repoName,
      repo.description,
      readme,
      firstSkillText,
      input.summary?.zh,
      input.summary?.en,
      ...asArray(input.tags),
    ].join("\n");
    const category = categoryFrom(input.category, combinedText);
    const audiences = inferAudiences(input, combinedText);
    const chineseScore = Math.max(
      calculateChineseScore(description.zh, readme, firstSkillText),
      input.summary?.zh ? 45 : 0,
    );

    return {
      repo: repoName,
      name: asString(
        input.name || fm.name || repo.name || repoName.split("/").at(-1),
      ),
      descriptionZh: description.zh,
      descriptionEn: description.en,
      readmeSnippetZh: hasChinese(readme)
        ? truncateText(readme)
        : hasChinese(firstSkillText)
          ? truncateText(firstSkillText)
          : "",
      readmeSnippetEn: truncateText(readme || firstSkillText),
      categoryCode: category.code,
      categoryName: categoryPayload(category).name,
      tags: [
        ...new Set(
          [...asArray(input.tags), ...asArray(repo.topics)].slice(0, 12),
        ),
      ],
      audiences,
      useCases: useCasesForAudiences(audiences),
      skillMdPaths,
      stars: asFiniteNumber(repo.stargazers_count),
      forks: asFiniteNumber(repo.forks_count),
      openIssues: asFiniteNumber(repo.open_issues_count),
      watchers: asFiniteNumber(repo.watchers_count, repo.stargazers_count),
      language: asString(repo.language),
      license: repoLicense(repo),
      topics: asArray(repo.topics),
      homepage: asString(input.homepage || repo.homepage),
      htmlUrl: asString(repo.html_url, `https://github.com/${repoName}`),
      createdAt: asString(repo.created_at),
      updatedAt: asString(repo.updated_at),
      pushedAt: asString(repo.pushed_at),
      lastFetchedAt: generatedAt,
      fetchStatus: "ok",
      rank: 0,
      rankByCategory: 0,
      growth7d: null,
      growth30d: null,
      rankDelta7d: null,
      rankDelta30d: null,
      trendStatus: "collecting",
      chineseScore,
      skillSignalScore: Math.min(100, 60 + skillMdPaths.length * 5),
      featured: Boolean(input.featured),
      ecosystems: [],
      hnMetric: null,
      productHuntVotes: null,
      relatedMCPs: [],
      popularityScore: 0,
      activityScore: 0,
      adoptionScore: 0,
      officialScore: 0,
      ecosystemScore: 0,
      compositeScore: 0,
      releaseCount: 0,
      latestRelease: null,
      weeklyCommits: 0,
      contributors: 0,
    };
  } catch (error) {
    return {
      repo: repoName,
      name: repoName.split("/").at(-1) ?? repoName,
      descriptionZh: asString(input.summary?.zh),
      descriptionEn: asString(input.summary?.en || input.summary?.zh),
      readmeSnippetZh: "",
      readmeSnippetEn: "",
      categoryCode: categoryFrom(input.category).code,
      categoryName: categoryPayload(categoryFrom(input.category)).name,
      tags: asArray(input.tags),
      audiences: inferAudiences(
        input,
        `${input.summary?.zh ?? ""} ${input.summary?.en ?? ""}`,
      ),
      useCases: [],
      skillMdPaths: [],
      stars: 0,
      forks: 0,
      openIssues: 0,
      watchers: 0,
      language: "",
      license: "",
      topics: [],
      homepage: asString(input.homepage),
      htmlUrl: `https://github.com/${repoName}`,
      createdAt: "",
      updatedAt: "",
      pushedAt: "",
      lastFetchedAt: generatedAt,
      fetchStatus: "error",
      errorMessage: error?.message ?? "GitHub refresh failed.",
      rank: 0,
      rankByCategory: 0,
      growth7d: null,
      growth30d: null,
      rankDelta7d: null,
      rankDelta30d: null,
      trendStatus: "collecting",
      chineseScore: calculateChineseScore(input.summary?.zh),
      skillSignalScore: 0,
      featured: Boolean(input.featured),
      ecosystems: [],
      hnMetric: null,
      productHuntVotes: null,
      relatedMCPs: [],
      popularityScore: 0,
      activityScore: 0,
      adoptionScore: 0,
      officialScore: 0,
      ecosystemScore: 0,
      compositeScore: 0,
      releaseCount: 0,
      latestRelease: null,
      weeklyCommits: 0,
      contributors: 0,
    };
  }
}

function compareSkillDefault(a, b) {
  return (
    b.stars - a.stars ||
    b.chineseScore - a.chineseScore ||
    Date.parse(b.pushedAt || b.updatedAt || "0") -
      Date.parse(a.pushedAt || a.updatedAt || "0") ||
    a.repo.localeCompare(b.repo)
  );
}

function addRanks(skills) {
  const sorted = [...skills].sort(compareSkillDefault);
  const globalRanks = new Map(
    sorted.map((skill, index) => [skill.repo.toLowerCase(), index + 1]),
  );
  const categoryRanks = new Map();

  for (const categoryCode of [
    ...new Set(skills.map((skill) => skill.categoryCode)),
  ]) {
    sorted
      .filter((skill) => skill.categoryCode === categoryCode)
      .forEach((skill, index) =>
        categoryRanks.set(skill.repo.toLowerCase(), index + 1),
      );
  }

  return sorted.map((skill) => ({
    ...skill,
    rank: globalRanks.get(skill.repo.toLowerCase()) ?? 0,
    rankByCategory: categoryRanks.get(skill.repo.toLowerCase()) ?? 0,
  }));
}

function categoriesFromSkills(skills, inputs) {
  const categories = new Map();
  for (const input of inputs) {
    const category = categoryFrom(input.category);
    categories.set(category.code, categoryPayload(category));
  }
  for (const skill of skills) {
    categories.set(skill.categoryCode, {
      code: skill.categoryCode,
      name: skill.categoryName,
      sortOrder:
        CATEGORY_ALIASES.get(skill.categoryCode)?.sortOrder ??
        CATEGORY_DEFINITIONS.length + 1,
    });
  }
  return [...categories.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
  );
}

function isV3Snapshot(snapshot) {
  return snapshot?.schemaVersion === 3 && Array.isArray(snapshot?.skills);
}

function markPreviousSnapshotFallback(
  previousSnapshot,
  error,
  generatedAt,
  skillInputs = [],
) {
  const allowedRepos = new Set(
    skillInputs.map((input) => normalizeRepoName(input.repo).toLowerCase()),
  );
  const inputsByRepo = new Map(
    skillInputs.map((input) => [
      normalizeRepoName(input.repo).toLowerCase(),
      input,
    ]),
  );
  return {
    ...previousSnapshot,
    generatedAt,
    source: "github-skills-fallback",
    errorMessage:
      error?.message ?? "GitHub API unavailable; reused previous snapshot.",
    skills: previousSnapshot.skills
      .filter(
        (skill) =>
          allowedRepos.size === 0 ||
          allowedRepos.has(normalizeRepoName(skill.repo).toLowerCase()),
      )
      .map((skill) => ({
        ...skill,
        name:
          asString(
            inputsByRepo.get(normalizeRepoName(skill.repo).toLowerCase())?.name,
          ) || skill.name,
        descriptionZh:
          asString(
            inputsByRepo.get(normalizeRepoName(skill.repo).toLowerCase())
              ?.summary?.zh,
          ) || skill.descriptionZh,
        descriptionEn:
          asString(
            inputsByRepo.get(normalizeRepoName(skill.repo).toLowerCase())
              ?.summary?.en,
          ) || skill.descriptionEn,
        fetchStatus: "fallback",
        errorMessage:
          error?.message ?? "GitHub API unavailable; reused previous snapshot.",
        lastFetchedAt: generatedAt,
      })),
  };
}

export async function buildSnapshot({
  skillInputs = [],
  githubFetch = createJsonFetcher({ token: process.env.GITHUB_TOKEN }),
  previousSnapshot = null,
  generatedAt = nowIso(),
} = {}) {
  const inputs = skillInputs.map((input) => ({
    ...input,
    repo: normalizeRepoName(input.repo),
  }));

  const skills = await mapWithConcurrency(inputs, 5, (input) =>
    buildSkillSnapshot(input, githubFetch, generatedAt),
  );

  if (
    skills.length > 0 &&
    skills.every((skill) => skill.fetchStatus === "error") &&
    isV3Snapshot(previousSnapshot) &&
    previousSnapshot.skills.length > 0
  ) {
    return markPreviousSnapshotFallback(
      previousSnapshot,
      new Error(skills[0].errorMessage ?? "GitHub refresh failed."),
      generatedAt,
      inputs,
    );
  }

  const ranked = addRanks(skills);

  // Enrich with ecosystem data
  const anthropicVerified = await fetchAnthropicSkills(githubFetch);

  const enrichedSkills = await mapWithConcurrency(ranked, 5, async (skill) => {
    if (skill.fetchStatus !== "ok") {
      return {
        ...skill,
        ecosystems: classifyEcosystem(skill),
      };
    }

    const [commitData, releaseData] = await Promise.all([
      fetchCommitActivity(githubFetch, skill.repo),
      fetchReleaseData(githubFetch, skill.repo),
    ]);

    const ecosystems = classifyEcosystem(skill);
    const scored = calculateEcosystemScores(skill, commitData, releaseData);

    return {
      ...skill,
      ecosystems,
      weeklyCommits: commitData.weeklyCommits,
      contributors: commitData.commitHistoryLength > 0
        ? await fetchContributors(githubFetch, skill.repo)
        : 0,
      releaseCount: releaseData.releaseCount,
      latestRelease: releaseData.latestRelease,
      ...scored,
    };
  });

  // Resolve contributors sequentially to avoid rate limits
  for (let i = 0; i < enrichedSkills.length; i++) {
    const skill = enrichedSkills[i];
    if (skill.fetchStatus === "ok" && skill.contributors === 0) {
      try {
        skill.contributors = await fetchContributors(githubFetch, skill.repo);
      } catch {
        skill.contributors = 0;
      }
    }
  }

  return {
    schemaVersion: 3,
    generatedAt,
    source: "agent-skills-radar",
    categories: categoriesFromSkills(enrichedSkills, inputs),
    skills: enrichedSkills,
    ecosystemBreakdown: computeEcosystemBreakdown(enrichedSkills),
    totalEcosystemSources: countTotalEcosystemSources(enrichedSkills),
    lastEcosystemSync: nowIso(),
    hnMentionsCount: 0,
  };
}

async function verifyCandidate(githubFetch, item, query, curatedRepos) {
  const repoName = normalizeRepoName(item.full_name);
  if (!repoName || curatedRepos.has(repoName.toLowerCase())) {
    return null;
  }
  if (isExcludedRepo(item)) return null;
  try {
    const branch = asString(item.default_branch, "main");
    const skillMdPaths = await fetchSkillPaths(githubFetch, repoName, branch);
    if (skillMdPaths.length === 0) return null;
    if (isExcludedRepo(item, skillMdPaths.join(" "))) return null;
    const text = `${item.description ?? ""} ${(item.topics ?? []).join(" ")} ${skillMdPaths.join(" ")}`;
    const category = categoryFrom(query.category, text);
    const audiences = inferAudiences(query, text);
    return {
      repo: repoName,
      name: asString(item.name, repoName.split("/").at(-1)),
      description: asString(item.description),
      stars: asFiniteNumber(item.stargazers_count),
      forks: asFiniteNumber(item.forks_count),
      htmlUrl: asString(item.html_url, `https://github.com/${repoName}`),
      language: asString(item.language),
      topics: asArray(item.topics),
      skillMdPaths,
      matchedQuery: asString(query.id),
      reason: {
        zh: asString(
          query.reason?.zh || "GitHub 搜索发现包含 SKILL.md 的项目。",
        ),
        en: asString(query.reason?.en || "Discovered by GitHub search."),
      },
      alreadyCurated: false,
      suggestedCategory: category.code,
      suggestedAudiences: audiences,
      confidence: Math.min(100, 60 + skillMdPaths.length * 10),
    };
  } catch {
    return null;
  }
}

export async function buildCandidates({
  queries = [],
  curatedRepos = new Set(),
  githubFetch = createJsonFetcher({ token: process.env.GITHUB_TOKEN }),
  generatedAt = nowIso(),
} = {}) {
  const normalizedCurated = new Set(
    [...curatedRepos].map((repo) => normalizeRepoName(repo).toLowerCase()),
  );
  const candidates = [];
  const seen = new Set();

  for (const query of queries) {
    const url = new URL(`${GITHUB_API}/search/repositories`);
    url.searchParams.set("q", asString(query.query));
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set("per_page", String(asFiniteNumber(query.limit, 10)));
    try {
      const payload = await githubFetch(url.toString());
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const verified = await mapWithConcurrency(items, 4, (item) =>
        verifyCandidate(githubFetch, item, query, normalizedCurated),
      );
      for (const candidate of verified.filter(Boolean)) {
        const key = candidate.repo.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(candidate);
      }
    } catch (error) {
      console.warn(
        `Discovery query "${query.id ?? query.query}" failed: ${error?.message ?? error}`,
      );
    }
  }

  return {
    generatedAt,
    source: "github-search",
    candidates: candidates.sort(
      (a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo),
    ),
  };
}

function byDate(a, b) {
  return a.date.localeCompare(b.date);
}

function normalizeHistory(history, retentionDays = HISTORY_RETENTION_DAYS) {
  if (history?.schemaVersion !== 3 || !Array.isArray(history.repositories)) {
    return {
      schemaVersion: 3,
      generatedAt: String(history?.generatedAt ?? nowIso()),
      retentionDays,
      repositories: [],
    };
  }

  return {
    schemaVersion: 3,
    generatedAt: String(history.generatedAt ?? nowIso()),
    retentionDays,
    repositories: history.repositories
      .filter((repoHistory) => repoHistory?.repo)
      .map((repoHistory) => ({
        repo: normalizeRepoName(repoHistory.repo),
        samples: Array.isArray(repoHistory.samples)
          ? repoHistory.samples
              .filter((sample) => sample?.date)
              .map((sample) => ({
                date: String(sample.date).slice(0, 10),
                stars: asFiniteNumber(sample.stars),
                forks: asFiniteNumber(sample.forks),
                rank: asFiniteNumber(sample.rank),
                rankByCategory: asFiniteNumber(sample.rankByCategory),
              }))
              .sort(byDate)
          : [],
      }))
      .filter((repoHistory) => repoHistory.samples.length > 0),
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
    .filter((history) => history.repositories.length > 0);
  const generatedAt =
    normalizedHistories
      .map((history) => history.generatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? nowIso();
  const historyByRepo = new Map();

  for (const history of normalizedHistories) {
    for (const repoHistory of history.repositories) {
      const key = repoHistory.repo.toLowerCase();
      const existing = historyByRepo.get(key) ?? {
        repo: repoHistory.repo,
        samples: new Map(),
      };
      for (const sample of repoHistory.samples) {
        existing.samples.set(sample.date, sample);
      }
      historyByRepo.set(key, existing);
    }
  }

  return {
    schemaVersion: 3,
    generatedAt,
    retentionDays,
    repositories: [...historyByRepo.values()]
      .map((repoHistory) => ({
        repo: repoHistory.repo,
        samples: [...repoHistory.samples.values()].sort(byDate),
      }))
      .sort((a, b) => a.repo.localeCompare(b.repo)),
  };
}

function createSampleFromSkill(skill, generatedAt) {
  return {
    date: toUtcDate(generatedAt),
    stars: asFiniteNumber(skill.stars),
    forks: asFiniteNumber(skill.forks),
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
  const skills = isV3Snapshot(snapshot) ? snapshot.skills : [];

  return normalizeHistory(
    {
      schemaVersion: 3,
      generatedAt,
      retentionDays,
      repositories: skills
        .filter((skill) => skill?.repo && isReliableHistorySkill(skill))
        .map((skill) => ({
          repo: normalizeRepoName(skill.repo),
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
    growth: asFiniteNumber(skill.stars) - previous.stars,
    rankDelta: previous.rank - asFiniteNumber(skill.rank),
  };
}

export function addTrendMetricsToSnapshot(snapshot, history) {
  const normalizedHistory = normalizeHistory(
    history,
    history?.retentionDays ?? HISTORY_RETENTION_DAYS,
  );
  const historyByRepo = new Map(
    normalizedHistory.repositories.map((repoHistory) => [
      repoHistory.repo.toLowerCase(),
      repoHistory,
    ]),
  );
  const generatedAt = snapshot?.generatedAt ?? nowIso();

  return {
    ...snapshot,
    generatedAt,
    skills: (snapshot?.skills ?? []).map((skill) => {
      const repoHistory = historyByRepo.get(
        normalizeRepoName(skill.repo).toLowerCase(),
      );
      const sevenDay = buildTrendMetric(skill, repoHistory, generatedAt, 7);
      const thirtyDay = buildTrendMetric(skill, repoHistory, generatedAt, 30);
      const trendStatus =
        sevenDay.growth === null || thirtyDay.growth === null
          ? "collecting"
          : "ready";

      return {
        ...skill,
        growth7d: sevenDay.growth,
        growth30d: thirtyDay.growth,
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
  const historyByRepo = new Map(
    normalizedHistory.repositories.map((repoHistory) => [
      repoHistory.repo.toLowerCase(),
      {
        repo: repoHistory.repo,
        samples: new Map(
          repoHistory.samples
            .filter((sample) => sample.date >= cutoffDate)
            .map((sample) => [sample.date, sample]),
        ),
      },
    ]),
  );

  for (const skill of snapshot?.skills ?? []) {
    if (!skill?.repo || !isReliableHistorySkill(skill)) continue;

    const key = normalizeRepoName(skill.repo).toLowerCase();
    const repoHistory = historyByRepo.get(key) ?? {
      repo: normalizeRepoName(skill.repo),
      samples: new Map(),
    };
    repoHistory.samples.set(
      currentDate,
      createSampleFromSkill(skill, generatedAt),
    );
    historyByRepo.set(key, repoHistory);
  }

  return {
    schemaVersion: 3,
    generatedAt,
    retentionDays,
    repositories: [...historyByRepo.values()]
      .map((repoHistory) => ({
        repo: repoHistory.repo,
        samples: [...repoHistory.samples.values()]
          .filter((sample) => sample.date >= cutoffDate)
          .sort(byDate),
      }))
      .filter((repoHistory) => repoHistory.samples.length > 0)
      .sort((a, b) => a.repo.localeCompare(b.repo)),
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

async function readYamlIfExists(filePath, fallback = {}) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return YAML.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

async function readSkills(filePath) {
  const payload = await readYamlIfExists(filePath, { skills: [] });
  return Array.isArray(payload.skills)
    ? payload.skills
    : Array.isArray(payload.repositories)
      ? payload.repositories
      : [];
}

async function readDiscoveryQueries(filePath) {
  const payload = await readYamlIfExists(filePath, { queries: [] });
  return Array.isArray(payload.queries) ? payload.queries : [];
}

async function readHistory(historyPath, deployedHistoryPath) {
  const committedHistory = await readJsonIfExists(historyPath);
  const deployedHistory = await readJsonIfExists(deployedHistoryPath);
  return mergeHistoryPayloads([committedHistory, deployedHistory]);
}

export async function updateData({
  skillsPath = DEFAULT_SKILLS,
  discoveryPath = DEFAULT_DISCOVERY,
  snapshotPath = DEFAULT_SNAPSHOT,
  candidatesPath = DEFAULT_CANDIDATES,
  historyPath = DEFAULT_HISTORY,
  deployedHistoryPath = process.env.DEPLOYED_HISTORY_PATH,
  githubFetch = createJsonFetcher({ token: process.env.GITHUB_TOKEN }),
} = {}) {
  const skillInputs = await readSkills(skillsPath);
  const discoveryQueries = await readDiscoveryQueries(discoveryPath);
  const previousSnapshot = await readJsonIfExists(snapshotPath);
  const previousCandidates = await readJsonIfExists(candidatesPath);
  const previousHistory = await readHistory(historyPath, deployedHistoryPath);
  const snapshot = await buildSnapshot({
    skillInputs,
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
  const nextCandidates = await buildCandidates({
    queries: discoveryQueries,
    curatedRepos: new Set(skillInputs.map((skill) => skill.repo)),
    githubFetch,
    generatedAt: snapshotWithTrends.generatedAt,
  });
  const candidates =
    nextCandidates.candidates.length === 0 &&
    Array.isArray(previousCandidates?.candidates) &&
    previousCandidates.candidates.length > 0
      ? {
          ...previousCandidates,
          generatedAt: snapshotWithTrends.generatedAt,
          source: "github-search-fallback",
        }
      : nextCandidates;

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
    .then(({ snapshot, history, candidates }) => {
      console.log(
        `Updated ${snapshot.skills.length} skills across ${snapshot.totalEcosystemSources} ecosystem sources, ${candidates.candidates.length} candidates, and ${history.repositories.length} history timelines.`,
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
