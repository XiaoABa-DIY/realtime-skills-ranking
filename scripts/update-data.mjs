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
  "Design & Media",
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

export function createGitHubFetcher(token = process.env.GITHUB_TOKEN) {
  return async function githubFetch(url) {
    const response = await fetch(url, {
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

export async function buildSnapshot(
  inputs,
  githubFetch = createGitHubFetcher(),
) {
  const fetchedAt = nowIso();
  const repositories = [];

  for (const input of inputs) {
    try {
      const apiRepo = await githubFetch(`${GITHUB_API}/repos/${input.repo}`);
      repositories.push(mapRepoApiResponse(input, apiRepo, fetchedAt));
    } catch (error) {
      repositories.push(mapRepoFailure(input, error, fetchedAt));
    }
  }

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
      candidates.push({
        repo: `query-error/${query.id}`,
        fullName: `query-error/${query.id}`,
        category: query.category,
        matchedQuery: query.id,
        reason: query.reason,
        description: error?.message ?? "GitHub search failed",
        stars: 0,
        forks: 0,
        language: "Unknown",
        license: "NOASSERTION",
        htmlUrl: "",
        pushedAt: "",
        updatedAt: "",
        alreadyCurated: false,
        fetchStatus: "error",
        lastFetchedAt: fetchedAt,
      });
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

export async function updateData({
  repositoriesPath = DEFAULT_REPOSITORIES,
  discoveryPath = DEFAULT_DISCOVERY,
  snapshotPath = DEFAULT_SNAPSHOT,
  candidatesPath = DEFAULT_CANDIDATES,
  githubFetch = createGitHubFetcher(),
} = {}) {
  const repositories = await readRepositoryInputs(repositoriesPath);
  const discoveryQueries = await readDiscoveryQueries(discoveryPath);
  const snapshot = await buildSnapshot(repositories, githubFetch);
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
