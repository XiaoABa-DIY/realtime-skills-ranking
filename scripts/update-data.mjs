import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import prettier from "prettier";
import YAML from "yaml";

const ROOT = process.cwd();
const DEFAULT_REPOSITORIES = path.join(ROOT, "data", "repositories.yml");
const DEFAULT_DISCOVERY = path.join(ROOT, "data", "discovery-queries.yml");
const DEFAULT_SNAPSHOT = path.join(ROOT, "public", "data", "snapshot.json");
const DEFAULT_CANDIDATES = path.join(ROOT, "public", "data", "candidates.json");
const DEFAULT_HISTORY = path.join(ROOT, "public", "data", "history.json");
const GITHUB_API = "https://api.github.com";
export const HISTORY_RETENTION_DAYS = 180;

export const CATEGORIES = [
  "Coding Agents",
  "Developer Tools",
  "Design & Media",
  "Creator & Content",
  "Data & Research",
  "Productivity",
  "MCP & Tooling",
  "Prompt & Workflow",
  "Learning & Docs",
];

const AUDIENCE_KEYS = [
  "developer",
  "creator",
  "designMarketing",
  "research",
  "productivity",
  "mcp",
];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];
const STATUSES = ["active", "experimental", "archived"];
const AUDIENCE_PROFILES = {
  developer: {
    categories: ["Developer Tools", "Coding Agents", "MCP & Tooling"],
    platforms: ["CLI", "VS Code", "IDE", "Git", "Developers", "Agents"],
    tags: ["coding-agent", "terminal", "sdk", "software-engineering"],
  },
  creator: {
    categories: ["Creator & Content", "Design & Media", "Prompt & Workflow"],
    platforms: ["Creators", "Audio", "Voice", "Documents", "Writing", "Images"],
    tags: ["content", "tts", "ocr", "research-writing", "document-conversion"],
  },
  designMarketing: {
    categories: ["Design & Media", "Creator & Content", "Productivity"],
    platforms: ["Images", "Workflows", "Creators", "Low-code"],
    tags: ["image-generation", "nodes", "content"],
  },
  research: {
    categories: ["Data & Research", "Learning & Docs"],
    platforms: ["RAG", "Web", "Learning", "Python"],
    tags: ["rag", "data", "knowledge", "web-crawling", "course"],
  },
  productivity: {
    categories: ["Productivity", "Prompt & Workflow"],
    platforms: ["Automation", "Low-code", "Workflows", "Apps", "Chat"],
    tags: ["automation", "low-code", "ai-workflows"],
  },
  mcp: {
    categories: ["MCP & Tooling", "Developer Tools"],
    platforms: ["MCP", "TypeScript"],
    tags: ["mcp", "tools", "integrations", "sdk"],
  },
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

function byDateThenRepo(a, b) {
  return a.date.localeCompare(b.date);
}

function isReliableHistoryRepo(repo) {
  if (!repo?.errorMessage) return repo?.fetchStatus !== "error";
  return /used public GitHub HTML fallback|used GitHub Search fallback/i.test(
    repo.errorMessage,
  );
}

export function normalizeRepo(repo) {
  return String(repo ?? "")
    .trim()
    .replace(/^https:\/\/github\.com\//i, "")
    .replace(/\/+$/g, "");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asAudienceArray(value) {
  return asArray(value).filter((item) => AUDIENCE_KEYS.includes(item));
}

function asUseCases(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => isRecord(item) && item.zh && item.en)
    .map((item) => ({
      zh: String(item.zh),
      en: String(item.en),
    }));
}

function validateRepoInput(entry, index) {
  const repo = normalizeRepo(entry.repo);
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
    throw new Error(`repositories[${index}].repo must look like owner/name`);
  }

  if (!CATEGORIES.includes(entry.category)) {
    throw new Error(
      `repositories[${index}].category must be one of: ${CATEGORIES.join(", ")}`,
    );
  }

  const summary = isRecord(entry.summary) ? entry.summary : {};
  if (!summary.zh || !summary.en) {
    throw new Error(
      `repositories[${index}].summary.zh and summary.en are required`,
    );
  }

  return {
    repo,
    category: entry.category,
    platforms: asArray(entry.platforms),
    tags: asArray(entry.tags),
    summary: {
      zh: String(summary.zh),
      en: String(summary.en),
    },
    homepage: entry.homepage ? String(entry.homepage) : undefined,
    featured: Boolean(entry.featured),
    audiences: asAudienceArray(entry.audiences),
    useCases: asUseCases(entry.useCases),
    difficulty: DIFFICULTIES.includes(entry.difficulty)
      ? entry.difficulty
      : undefined,
    status: STATUSES.includes(entry.status) ? entry.status : undefined,
  };
}

export async function readYamlFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return YAML.parse(raw);
}

export async function readRepositoryInputs(filePath = DEFAULT_REPOSITORIES) {
  const document = await readYamlFile(filePath);
  const repositories = Array.isArray(document?.repositories)
    ? document.repositories
    : [];
  const normalized = repositories.map(validateRepoInput);
  const seen = new Set();

  for (const item of normalized) {
    const key = item.repo.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`Duplicate repository in curated list: ${item.repo}`);
    }
    seen.add(key);
  }

  return normalized;
}

export async function readDiscoveryQueries(filePath = DEFAULT_DISCOVERY) {
  const document = await readYamlFile(filePath);
  const queries = Array.isArray(document?.queries) ? document.queries : [];

  return queries
    .filter((query) => query?.id && query?.query)
    .map((query) => ({
      id: String(query.id),
      query: String(query.query),
      category: CATEGORIES.includes(query.category)
        ? query.category
        : "Prompt & Workflow",
      limit: Number.isFinite(Number(query.limit)) ? Number(query.limit) : 10,
      reason: {
        zh: String(query.reason?.zh ?? "由自动发现查询匹配到的候选仓库。"),
        en: String(
          query.reason?.en ??
            "Candidate repository matched by automated discovery.",
        ),
      },
    }));
}

function timeoutSignal(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
}

export function createGitHubFetcher(
  token = process.env.GITHUB_TOKEN,
  timeoutMs = 12_000,
) {
  return async function githubFetch(url) {
    const response = await fetch(url, {
      signal: timeoutSignal(timeoutMs),
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "realtime-ai-skills-ranking",
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
      const error = new Error(`GitHub API ${response.status}: ${message}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body;
  };
}

export function createGitHubHtmlFetcher(timeoutMs = 8_000) {
  return async function githubHtmlFetch(url) {
    return fetch(url, {
      signal: timeoutSignal(timeoutMs),
      headers: {
        "User-Agent": "realtime-ai-skills-ranking",
      },
    });
  };
}

function mapRepoApiResponse(input, apiRepo, fetchedAt) {
  return {
    ...input,
    fullName: apiRepo.full_name ?? input.repo,
    description: apiRepo.description ?? "",
    stars: Number(apiRepo.stargazers_count ?? 0),
    forks: Number(apiRepo.forks_count ?? 0),
    openIssues: Number(apiRepo.open_issues_count ?? 0),
    watchers: Number(apiRepo.subscribers_count ?? apiRepo.watchers_count ?? 0),
    language: apiRepo.language ?? "Unknown",
    license: apiRepo.license?.spdx_id ?? apiRepo.license?.name ?? "NOASSERTION",
    homepage: input.homepage ?? apiRepo.homepage ?? "",
    htmlUrl: apiRepo.html_url ?? `https://github.com/${input.repo}`,
    pushedAt: apiRepo.pushed_at ?? "",
    updatedAt: apiRepo.updated_at ?? "",
    archived: Boolean(apiRepo.archived),
    disabled: Boolean(apiRepo.disabled),
    fetchStatus: "ok",
    lastFetchedAt: fetchedAt,
  };
}

function mapRepoFailure(input, error, fetchedAt) {
  return mapRepoFailureWithPrevious(input, error, fetchedAt);
}

function hasAny(source, targets) {
  const normalized = new Set(source.map((item) => String(item).toLowerCase()));
  return targets.some((target) => normalized.has(String(target).toLowerCase()));
}

function matchesAudience(repo, audience) {
  if (repo.audiences?.includes(audience)) return true;
  const profile = AUDIENCE_PROFILES[audience];
  return (
    profile.categories.includes(repo.category) ||
    hasAny(repo.platforms ?? [], profile.platforms) ||
    hasAny(repo.tags ?? [], profile.tags)
  );
}

function inferAudiences(repo) {
  const explicit = Array.isArray(repo.audiences)
    ? repo.audiences.filter((audience) => AUDIENCE_KEYS.includes(audience))
    : [];
  if (explicit.length) return explicit;

  const inferred = AUDIENCE_KEYS.filter((audience) =>
    matchesAudience(repo, audience),
  );
  return inferred.length ? inferred : ["productivity"];
}

function daysSince(value, referenceIso) {
  const timestamp = Date.parse(value || "");
  const reference = Date.parse(referenceIso || "");
  if (!Number.isFinite(timestamp) || !Number.isFinite(reference)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.floor((reference - timestamp) / 86_400_000);
}

function recentActivityDays(repo, referenceIso) {
  return Math.min(
    daysSince(repo.pushedAt, referenceIso),
    daysSince(repo.updatedAt, referenceIso),
  );
}

function inferFreshness(repo, referenceIso) {
  if (repo.archived || repo.disabled) return "stale";
  const age = recentActivityDays(repo, referenceIso);
  if (!Number.isFinite(age)) return "unknown";
  if (age <= 30) return "fresh";
  if (age <= 180) return "active";
  if (age <= 540) return "quiet";
  return "stale";
}

function buildQualitySignals(repo, referenceIso) {
  const age = recentActivityDays(repo, referenceIso);
  const issueLoad =
    repo.openIssues === undefined
      ? "unknown"
      : repo.openIssues < 10
        ? "low"
        : repo.openIssues < 50
          ? "medium"
          : "high";

  return {
    hasLicense: Boolean(repo.license && repo.license !== "NOASSERTION"),
    hasHomepage: Boolean(repo.homepage),
    recentlyPushed: Number.isFinite(age) ? age <= 90 : false,
    archived: Boolean(repo.archived || repo.disabled),
    issueLoad,
  };
}

function inferCandidateConfidence(candidate) {
  const starScore = Math.min(
    48,
    Math.round(Math.log10(Number(candidate.stars ?? 0) + 1) * 18),
  );
  const freshnessScore = Date.parse(candidate.updatedAt || "") ? 14 : 0;
  const licenseScore =
    candidate.license && candidate.license !== "NOASSERTION" ? 12 : 0;
  return Math.max(
    42,
    Math.min(96, starScore + freshnessScore + licenseScore + 24),
  );
}

function addRepositoryDerivedFields(repositories, fetchedAt) {
  const globalRanks = new Map(
    [...repositories]
      .sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo))
      .map((repo, index) => [repo.repo, index + 1]),
  );
  const categoryRanks = new Map();

  for (const category of CATEGORIES) {
    [...repositories]
      .filter((repo) => repo.category === category)
      .sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo))
      .forEach((repo, index) => categoryRanks.set(repo.repo, index + 1));
  }

  return repositories.map((repo) => ({
    ...repo,
    audiences: inferAudiences(repo),
    status: repo.status ?? (repo.archived ? "archived" : "active"),
    rank: globalRanks.get(repo.repo),
    rankByCategory: categoryRanks.get(repo.repo),
    freshness: inferFreshness(repo, fetchedAt),
    qualitySignals: buildQualitySignals(repo, fetchedAt),
  }));
}

function mapRepoFailureWithPrevious(input, error, fetchedAt, previous) {
  if (previous && Number(previous.stars) > 0) {
    return {
      ...previous,
      ...input,
      fetchStatus:
        previous.fetchStatus && previous.fetchStatus !== "error"
          ? previous.fetchStatus
          : "ok",
      errorMessage: error?.message ?? "Unknown GitHub API error",
      lastFetchedAt: fetchedAt,
    };
  }

  return {
    ...input,
    fullName: input.repo,
    description: "",
    stars: 0,
    forks: 0,
    openIssues: 0,
    watchers: 0,
    language: "Unknown",
    license: "NOASSERTION",
    homepage: input.homepage ?? "",
    htmlUrl: `https://github.com/${input.repo}`,
    pushedAt: "",
    updatedAt: "",
    archived: false,
    disabled: false,
    fetchStatus: "error",
    errorMessage: error?.message ?? "Unknown GitHub API error",
    lastFetchedAt: fetchedAt,
  };
}

export function parseCompactNumber(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, "")
    .toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return 0;

  const amount = Number(match[1]);
  const suffix = match[2];
  if (suffix === "m") return Math.round(amount * 1_000_000);
  if (suffix === "k") return Math.round(amount * 1_000);
  return Math.round(amount);
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function parseGitHubRepoHtml(repo, html) {
  const escapedRepo = repo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const starsMatch = html.match(
    new RegExp(
      `href="/${escapedRepo}/stargazers"[\\s\\S]*?<strong>([^<]+)</strong>\\s*stars`,
      "i",
    ),
  );
  const forksMatch = html.match(
    new RegExp(
      `href="/${escapedRepo}/forks"[\\s\\S]*?<strong>([^<]+)</strong>\\s*forks`,
      "i",
    ),
  );
  const descriptionMatch =
    html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ??
    html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);

  return {
    stars: parseCompactNumber(starsMatch?.[1]),
    forks: parseCompactNumber(forksMatch?.[1]),
    description: decodeHtml(descriptionMatch?.[1] ?? ""),
  };
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

async function mapRepoHtmlFallback(
  input,
  htmlFetch,
  fetchedAt,
  error,
  previous,
) {
  const response = await htmlFetch(`https://github.com/${input.repo}`);
  if (!response.ok) {
    throw new Error(`GitHub HTML ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const canonicalRepo = normalizeRepo(new URL(response.url).pathname);
  const fallback = parseGitHubRepoHtml(canonicalRepo || input.repo, html);
  if (!fallback.stars) {
    throw new Error("GitHub HTML fallback did not expose stars");
  }

  return {
    ...input,
    repo: canonicalRepo || input.repo,
    fullName: (previous?.fullName ?? canonicalRepo) || input.repo,
    description: fallback.description || previous?.description || "",
    stars: fallback.stars,
    forks: fallback.forks || previous?.forks || 0,
    openIssues: previous?.openIssues ?? 0,
    watchers: previous?.watchers ?? 0,
    language: previous?.language ?? "Unknown",
    license: previous?.license ?? "NOASSERTION",
    homepage: input.homepage ?? previous?.homepage ?? "",
    htmlUrl:
      previous?.htmlUrl ?? `https://github.com/${canonicalRepo || input.repo}`,
    pushedAt: previous?.pushedAt ?? "",
    updatedAt: previous?.updatedAt ?? "",
    archived: Boolean(previous?.archived),
    disabled: Boolean(previous?.disabled),
    fetchStatus: "ok",
    errorMessage: error?.message
      ? `REST API unavailable; used public GitHub HTML fallback. ${error.message}`
      : undefined,
    lastFetchedAt: fetchedAt,
  };
}

async function mapRepoSearchFallback(input, githubFetch, fetchedAt, error) {
  const url = new URL(`${GITHUB_API}/search/repositories`);
  url.searchParams.set("q", input.repo);
  url.searchParams.set("sort", "stars");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", "5");

  const result = await githubFetch(url.toString());
  const items = Array.isArray(result?.items) ? result.items : [];
  const apiRepo =
    items.find(
      (item) =>
        normalizeRepo(item.full_name).toLowerCase() ===
        input.repo.toLowerCase(),
    ) ?? items[0];

  if (!apiRepo) {
    throw new Error("GitHub search fallback returned no repositories");
  }

  return {
    ...mapRepoApiResponse(input, apiRepo, fetchedAt),
    errorMessage: error?.message
      ? `REST API unavailable; used GitHub Search fallback. ${error.message}`
      : undefined,
  };
}

export async function buildSnapshot(
  inputs,
  githubFetch = createGitHubFetcher(),
  { previousRepositories = [], htmlFetch = null } = {},
) {
  const fetchedAt = nowIso();
  const previousByRepo = new Map(
    previousRepositories.map((repo) => [
      normalizeRepo(repo.repo).toLowerCase(),
      repo,
    ]),
  );

  const repositories = await mapWithConcurrency(inputs, 4, async (input) => {
    const previous = previousByRepo.get(input.repo.toLowerCase());
    try {
      const apiRepo = await githubFetch(`${GITHUB_API}/repos/${input.repo}`);
      return mapRepoApiResponse(input, apiRepo, fetchedAt);
    } catch (error) {
      if (htmlFetch && (!previous || Number(previous.stars) === 0)) {
        try {
          return await mapRepoHtmlFallback(
            input,
            htmlFetch,
            fetchedAt,
            error,
            previous,
          );
        } catch {
          // Fall through to the ordinary failure path.
        }
      }
      if (!previous || Number(previous.stars) === 0) {
        try {
          return await mapRepoSearchFallback(
            input,
            githubFetch,
            fetchedAt,
            error,
          );
        } catch {
          // Fall through to the ordinary failure path.
        }
      }
      return mapRepoFailureWithPrevious(input, error, fetchedAt, previous);
    }
  });

  repositories.sort(
    (a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo),
  );

  return {
    generatedAt: fetchedAt,
    source: "github-rest",
    repositories: addRepositoryDerivedFields(repositories, fetchedAt),
  };
}

function mapCandidate(item, query, fetchedAt) {
  const candidate = {
    repo: item.full_name,
    fullName: item.full_name,
    category: query.category,
    suggestedCategory: query.category,
    matchedQuery: query.id,
    reason: query.reason,
    description: item.description ?? "",
    stars: Number(item.stargazers_count ?? 0),
    forks: Number(item.forks_count ?? 0),
    language: item.language ?? "Unknown",
    license: item.license?.spdx_id ?? item.license?.name ?? "NOASSERTION",
    htmlUrl: item.html_url,
    pushedAt: item.pushed_at ?? "",
    updatedAt: item.updated_at ?? "",
    alreadyCurated: false,
    lastFetchedAt: fetchedAt,
  };

  return {
    ...candidate,
    suggestedAudiences: inferAudiences(candidate),
    confidence: inferCandidateConfidence(candidate),
  };
}

export async function buildCandidates(
  queries,
  curatedInputs,
  githubFetch = createGitHubFetcher(),
) {
  const fetchedAt = nowIso();
  const curated = new Set(
    curatedInputs.map((input) => input.repo.toLowerCase()),
  );
  const seen = new Set();
  const candidates = [];

  for (const query of queries) {
    const url = new URL(`${GITHUB_API}/search/repositories`);
    url.searchParams.set("q", query.query);
    url.searchParams.set("sort", "stars");
    url.searchParams.set("order", "desc");
    url.searchParams.set(
      "per_page",
      String(Math.min(Math.max(query.limit, 1), 20)),
    );

    try {
      const result = await githubFetch(url.toString());
      const items = Array.isArray(result?.items) ? result.items : [];
      for (const item of items) {
        const repo = normalizeRepo(item.full_name);
        const key = repo.toLowerCase();
        if (!repo || curated.has(key) || seen.has(key)) continue;
        seen.add(key);
        candidates.push(mapCandidate(item, query, fetchedAt));
      }
    } catch (error) {
      console.warn(
        `Skipping candidate query "${query.id}": ${error?.message ?? "GitHub search failed"}`,
      );
    }
  }

  candidates.sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo));

  return {
    generatedAt: fetchedAt,
    source: "github-search",
    candidates,
  };
}

function createSampleFromRepo(repo, generatedAt) {
  return {
    date: toUtcDate(generatedAt),
    stars: asFiniteNumber(repo.stars),
    forks: asFiniteNumber(repo.forks),
    rank: asFiniteNumber(repo.rank),
    rankByCategory: asFiniteNumber(repo.rankByCategory),
  };
}

function normalizeHistory(history, retentionDays = HISTORY_RETENTION_DAYS) {
  const repositories = Array.isArray(history?.repositories)
    ? history.repositories
    : [];

  return {
    generatedAt: String(history?.generatedAt ?? nowIso()),
    retentionDays,
    repositories: repositories
      .filter((repoHistory) => repoHistory?.repo)
      .map((repoHistory) => ({
        repo: normalizeRepo(repoHistory.repo),
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
              .sort(byDateThenRepo)
          : [],
      }))
      .filter((repoHistory) => repoHistory.samples.length > 0),
  };
}

export function createHistoryFromSnapshot(
  snapshot,
  retentionDays = HISTORY_RETENTION_DAYS,
) {
  const generatedAt = snapshot?.generatedAt ?? nowIso();
  const repositories = Array.isArray(snapshot?.repositories)
    ? snapshot.repositories
    : [];

  return normalizeHistory(
    {
      generatedAt,
      retentionDays,
      repositories: repositories
        .filter((repo) => repo?.repo && isReliableHistoryRepo(repo))
        .map((repo) => ({
          repo: normalizeRepo(repo.repo),
          samples: [createSampleFromRepo(repo, generatedAt)],
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

function buildTrendMetric(repo, history, generatedAt, days) {
  const currentDate = toUtcDate(generatedAt);
  const targetDate = addUtcDays(currentDate, -days);
  const previous = findSampleAtOrBefore(history?.samples ?? [], targetDate);

  if (!previous || !isReliableHistoryRepo(repo)) {
    return {
      growth: null,
      rankDelta: null,
    };
  }

  return {
    growth: asFiniteNumber(repo.stars) - previous.stars,
    rankDelta: previous.rank - asFiniteNumber(repo.rank),
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
    repositories: (snapshot?.repositories ?? []).map((repo) => {
      const repoHistory = historyByRepo.get(
        normalizeRepo(repo.repo).toLowerCase(),
      );
      const sevenDay = buildTrendMetric(repo, repoHistory, generatedAt, 7);
      const thirtyDay = buildTrendMetric(repo, repoHistory, generatedAt, 30);
      const trendStatus =
        sevenDay.growth === null || thirtyDay.growth === null
          ? "collecting"
          : "ready";

      return {
        ...repo,
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

  for (const repo of snapshot?.repositories ?? []) {
    if (!repo?.repo || !isReliableHistoryRepo(repo)) continue;

    const key = normalizeRepo(repo.repo).toLowerCase();
    const repoHistory = historyByRepo.get(key) ?? {
      repo: normalizeRepo(repo.repo),
      samples: new Map(),
    };
    repoHistory.samples.set(
      currentDate,
      createSampleFromRepo(repo, generatedAt),
    );
    historyByRepo.set(key, repoHistory);
  }

  return {
    generatedAt,
    retentionDays,
    repositories: [...historyByRepo.values()]
      .map((repoHistory) => ({
        repo: repoHistory.repo,
        samples: [...repoHistory.samples.values()]
          .filter((sample) => sample.date >= cutoffDate)
          .sort(byDateThenRepo),
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

async function readPreviousSnapshot(snapshotPath) {
  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readHistory(historyPath, seedSnapshot) {
  try {
    const raw = await fs.readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw);
    const history = normalizeHistory(
      parsed,
      parsed?.retentionDays ?? HISTORY_RETENTION_DAYS,
    );
    if (history.repositories.length > 0) return history;
  } catch {
    // Fall back to seeding from the checked-out snapshot below.
  }

  return createHistoryFromSnapshot(seedSnapshot);
}

export async function updateData({
  repositoriesPath = DEFAULT_REPOSITORIES,
  discoveryPath = DEFAULT_DISCOVERY,
  snapshotPath = DEFAULT_SNAPSHOT,
  candidatesPath = DEFAULT_CANDIDATES,
  historyPath = DEFAULT_HISTORY,
  githubFetch = createGitHubFetcher(),
  htmlFetch = createGitHubHtmlFetcher(),
} = {}) {
  const repositories = await readRepositoryInputs(repositoriesPath);
  const discoveryQueries = await readDiscoveryQueries(discoveryPath);
  const previousSnapshot = await readPreviousSnapshot(snapshotPath);
  const previousRepositories = Array.isArray(previousSnapshot?.repositories)
    ? previousSnapshot.repositories
    : [];
  const previousHistory = await readHistory(historyPath, previousSnapshot);
  const snapshot = await buildSnapshot(repositories, githubFetch, {
    previousRepositories,
    htmlFetch,
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
  const candidates = await buildCandidates(
    discoveryQueries,
    repositories,
    githubFetch,
  );

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
    .then(({ snapshot, candidates, history }) => {
      console.log(
        `Updated ${snapshot.repositories.length} curated repositories, ${candidates.candidates.length} candidates, and ${history.repositories.length} history timelines.`,
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
