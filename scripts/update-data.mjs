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
const GITHUB_API = "https://api.github.com";

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

function nowIso() {
  return new Date().toISOString();
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
    repositories,
  };
}

function mapCandidate(item, query, fetchedAt) {
  return {
    repo: item.full_name,
    fullName: item.full_name,
    category: query.category,
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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const formatted = await prettier.format(JSON.stringify(value), {
    parser: "json",
  });
  await fs.writeFile(`${filePath}.tmp`, formatted);
  await fs.rename(`${filePath}.tmp`, filePath);
}

async function readPreviousRepositories(snapshotPath) {
  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.repositories) ? parsed.repositories : [];
  } catch {
    return [];
  }
}

export async function updateData({
  repositoriesPath = DEFAULT_REPOSITORIES,
  discoveryPath = DEFAULT_DISCOVERY,
  snapshotPath = DEFAULT_SNAPSHOT,
  candidatesPath = DEFAULT_CANDIDATES,
  githubFetch = createGitHubFetcher(),
  htmlFetch = createGitHubHtmlFetcher(),
} = {}) {
  const repositories = await readRepositoryInputs(repositoriesPath);
  const discoveryQueries = await readDiscoveryQueries(discoveryPath);
  const previousRepositories = await readPreviousRepositories(snapshotPath);
  const snapshot = await buildSnapshot(repositories, githubFetch, {
    previousRepositories,
    htmlFetch,
  });
  const candidates = await buildCandidates(
    discoveryQueries,
    repositories,
    githubFetch,
  );

  await writeJson(snapshotPath, snapshot);
  await writeJson(candidatesPath, candidates);

  return {
    snapshot,
    candidates,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  updateData()
    .then(({ snapshot, candidates }) => {
      console.log(
        `Updated ${snapshot.repositories.length} curated repositories and ${candidates.candidates.length} candidates.`,
      );
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
