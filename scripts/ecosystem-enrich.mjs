// Ecosystem enrichment: multi-source data for Agent Skills Radar

const GITHUB_API = "https://api.github.com";
const HN_SEARCH_API = "https://hn.algolia.com/api/v1/search";
const HF_API = "https://huggingface.co/api";

function timeoutSignal(timeoutMs) {
  return AbortSignal.timeout(timeoutMs);
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

export function createJsonFetcher({
  token = "",
  timeoutMs = 20_000,
  userAgent = "agent-skills-radar",
} = {}) {
  return async function jsonFetch(url) {
    const response = await fetch(url, {
      signal: timeoutSignal(timeoutMs),
      headers: {
        Accept: "application/vnd.github+json",
        "X-Github-Api-Version": "2022-11-28",
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

// ─── Anthropic official skills sync ─────────────────────────────

export const ANTHROPIC_OFFICIAL_REPOS = [
  "anthropics/skills",
  "anthropics/claude-skills",
];

export async function fetchAnthropicSkills(githubFetch) {
  const verified = new Set();
  for (const repo of ANTHROPIC_OFFICIAL_REPOS) {
    try {
      const repoData = await githubFetch(`${GITHUB_API}/repos/${repo}`);
      if (repoData?.default_branch) {
        const branch = asString(repoData.default_branch, "main");
        const tree = await githubFetch(
          `${GITHUB_API}/repos/${repo}/git/trees/${branch}?recursive=1`,
        );
        const treeItems = Array.isArray(tree?.tree) ? tree.tree : [];
        for (const item of treeItems) {
          if (item?.type === "blob" && item.path.match(/SKILL\.md$/i)) {
            const skillName = item.path
              .replace(/SKILL\.md$/i, "")
              .toLowerCase();
            verified.add(`${repo}/${skillName}`);
          }
        }
      }
    } catch {
      // skip
    }
  }
  return verified;
}

// ─── GitHub Code Search discovery ───────────────────────────────

const CODE_SEARCH_PATTERNS = [
  "filename:SKILL.md",
  "filename:AGENTS.md",
  "filename:CLAUDE.md",
  "filename:codex.md",
];

export async function discoverByCodeSearch(githubFetch, limit = 20) {
  const discovered = new Map();
  for (const pattern of CODE_SEARCH_PATTERNS) {
    try {
      const url = new URL(`${GITHUB_API}/search/code`);
      url.searchParams.set("q", pattern);
      url.searchParams.set("per_page", String(Math.min(limit, 10)));
      const payload = await githubFetch(url.toString());
      const items = Array.isArray(payload?.items) ? payload.items : [];
      for (const item of items) {
        const repo = asString(item?.repository?.full_name);
        if (repo && !discovered.has(repo.toLowerCase())) {
          discovered.set(repo.toLowerCase(), {
            repo,
            skillFiles: asArray(item?.paths_in_file),
            score: asFiniteNumber(item?.score),
          });
        }
      }
    } catch {
      // skip
    }
  }
  return [...discovered.values()];
}

// ─── GitHub Topic discovery ─────────────────────────────────────

const TOPIC_KEYWORDS = [
  "agent-skills",
  "ai-skills",
  "claude-skills",
  "codex-skills",
  "mcp",
  "automation",
  "agent-framework",
  "skill-library",
];

export async function discoverByTopics(githubFetch, limit = 30) {
  const discovered = new Map();
  for (const topic of TOPIC_KEYWORDS) {
    try {
      const url = new URL(`${GITHUB_API}/search/repositories`);
      url.searchParams.set("q", `topic:${topic}`);
      url.searchParams.set("sort", "stars");
      url.searchParams.set("order", "desc");
      url.searchParams.set("per_page", String(Math.min(limit, 10)));
      const payload = await githubFetch(url.toString());
      const items = Array.isArray(payload?.items) ? payload.items : [];
      for (const item of items) {
        const repo = asString(item?.full_name);
        if (repo && !discovered.has(repo.toLowerCase())) {
          discovered.set(repo.toLowerCase(), {
            repo,
            topics: asArray(item?.topics),
            stars: asFiniteNumber(item?.stargazers_count),
          });
        }
      }
    } catch {
      // skip
    }
  }
  return [...discovered.values()];
}

// ─── Commit activity & Release data ─────────────────────────────

export async function fetchCommitActivity(githubFetch, repo) {
  try {
    const url = `${GITHUB_API}/repos/${repo}/stats/commit_activity`;
    const payload = await githubFetch(url);
    const weeks = Array.isArray(payload) ? payload : [];
    const recentWeeks = weeks.slice(-12);
    const totalCommits = recentWeeks.reduce(
      (sum, week) => sum + asFiniteNumber(week?.total, 0),
      0,
    );
    const weeklyAvg = Math.round(
      totalCommits / Math.max(recentWeeks.length, 1),
    );
    return { weeklyCommits: weeklyAvg, commitHistoryLength: weeks.length };
  } catch {
    return { weeklyCommits: 0, commitHistoryLength: 0 };
  }
}

export async function fetchReleaseData(githubFetch, repo) {
  try {
    const url = `${GITHUB_API}/repos/${repo}/releases?per_page=10`;
    const payload = await githubFetch(url);
    const releases = Array.isArray(payload) ? payload : [];
    const latest = releases[0];
    const totalDownloads = releases.reduce(
      (sum, r) =>
        sum +
        (Array.isArray(r?.assets)
          ? r.assets.reduce(
              (s, a) => s + asFiniteNumber(a?.download_count, 0),
              0,
            )
          : 0),
      0,
    );
    return {
      releaseCount: releases.length,
      latestRelease: asString(latest?.published_at),
      totalDownloads,
    };
  } catch {
    return { releaseCount: 0, latestRelease: "", totalDownloads: 0 };
  }
}

export async function fetchContributors(githubFetch, repo) {
  try {
    const url = new URL(`${GITHUB_API}/repos/${repo}/contributors`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("anon", "true");
    const payload = await githubFetch(url.toString());
    return Array.isArray(payload) ? payload.length : 0;
  } catch {
    return 0;
  }
}

// ─── HN mentions tracking ──────────────────────────────────────

export async function fetchHnMentions(repo, days = 30) {
  try {
    const query = `repo:${repo}`;
    const url = new URL(`${HN_SEARCH_API}/search_prefix`);
    url.searchParams.set("query", query);
    url.searchParams.set("tags", "story");
    url.searchParams.set("numRecords", "50");
    url.searchParams.set("fromDate", getDateString(days));
    const payload = await fetch(url.toString()).then((r) => r.json());
    const hits = Array.isArray(payload?.hits) ? payload.hits : [];
    const mentions30d = hits.length;
    const points = hits.reduce(
      (sum, h) => sum + asFiniteNumber(h?.points, 0),
      0,
    );
    const comments = hits.reduce(
      (sum, h) => sum + asFiniteNumber(h?.num_comments, 0),
      0,
    );
    return { mentions30d, points, comments };
  } catch {
    return { mentions30d: 0, points: 0, comments: 0 };
  }
}

function getDateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ─── HuggingFace related models ─────────────────────────────────

export async function fetchHfMetrics(repo) {
  try {
    const hfRepo = extractHuggingfaceRepo(repo);
    if (!hfRepo) return { hfLikes: 0, hfDownloads: 0, hfSpaces: 0 };
    const modelUrl = `${HF_API}/models/${hfRepo}?limit=5&sort=likes`;
    const payload = await fetch(modelUrl).then((r) => r.json());
    const models = Array.isArray(payload) ? payload : [];
    const likes = models.reduce(
      (sum, m) => sum + asFiniteNumber(m?.likes, 0),
      0,
    );
    const downloads = models.reduce(
      (sum, m) => sum + asFiniteNumber(m?.downloads, 0),
      0,
    );
    return { hfLikes: likes, hfDownloads: downloads, hfSpaces: 0 };
  } catch {
    return { hfLikes: 0, hfDownloads: 0, hfSpaces: 0 };
  }
}

function extractHuggingfaceRepo(githubRepo) {
  if (!githubRepo) return null;
  const match = githubRepo.match(/huggingface\/(.+)/i);
  return match ? match[1] : null;
}

// ─── Ecosystem classification ───────────────────────────────────

export function classifyEcosystem(skill) {
  const ecosystems = [];
  const text = [
    skill.name,
    skill.descriptionZh,
    skill.descriptionEn,
    skill.readmeSnippetZh,
    skill.readmeSnippetEn,
    ...skill.tags,
    ...skill.topics,
    ...skill.skillMdPaths,
  ]
    .join(" ")
    .toLowerCase();

  // Claude
  if (
    /claude|anthropic|\.claude\//i.test(text) ||
    /anthropic_skills|anthropic skills/i.test(text)
  ) {
    ecosystems.push({
      ecosystem: "claude",
      compatible: true,
      verified: false,
      badge: "Claude Compatible",
    });
  }

  // Codex / OpenAI
  if (
    /codex|openai|\.openai\//i.test(text) ||
    /openai_skills|openai skills/i.test(text)
  ) {
    ecosystems.push({
      ecosystem: "codex",
      compatible: true,
      verified: false,
      badge: "Codex Compatible",
    });
  }

  // Copilot / GitHub
  if (
    /copilot|github[_-]?skill/i.test(text) ||
    /github\.com\/copilot/i.test(text)
  ) {
    ecosystems.push({
      ecosystem: "copilot",
      compatible: true,
      verified: false,
      badge: "Copilot Compatible",
    });
  }

  // MCP
  if (/mcp|modelcontextprotocol|model-context-protocol/i.test(text)) {
    ecosystems.push({
      ecosystem: "mcp",
      compatible: true,
      verified: false,
      badge: "MCP-enabled",
    });
  }

  // HuggingFace
  if (/huggingface|hf\.co/i.test(text)) {
    ecosystems.push({
      ecosystem: "huggingface",
      compatible: true,
      verified: false,
      badge: "HF Connected",
    });
  }

  // Universal fallback
  if (skill.skillMdPaths.length > 0) {
    ecosystems.push({
      ecosystem: "universal",
      compatible: true,
      verified: false,
      badge: "Universal",
    });
  }

  return ecosystems;
}

export function addOfficialFlags(skill, anthropicVerified) {
  return skill.ecosystems.map((e) => {
    const enhanced = { ...e };
    const repoLower = skill.repo.toLowerCase();
    if (anthropicVerified.has(repoLower)) {
      enhanced.verified = true;
      enhanced.badge = `${enhanced.badge} ✓`;
    }
    return enhanced;
  });
}

// ─── Multi-dimensional scoring ──────────────────────────────────

export function calculateEcosystemScores(skill, commitData, releaseData) {
  // Popularity Score (0-100): based on stars + forks
  const popularity = Math.min(
    100,
    Math.round(
      (Math.log2(skill.stars + 1) * 15 +
        Math.log2(skill.forks + 1) * 10 +
        (skill.topics?.length || 0) * 3) /
        3,
    ),
  );

  // Activity Score (0-100): based on commit frequency + update recency
  const daysSinceUpdate =
    (Date.now() - Date.parse(skill.pushedAt || skill.updatedAt || "0")) /
    86400000;
  const recencyBonus = Math.max(0, 30 - daysSinceUpdate) / 30;
  const activity = Math.min(
    100,
    Math.round(
      asFiniteNumber(commitData?.weeklyCommits, 0) * 2 +
        recencyBonus * 20 +
        (releaseData?.releaseCount || 0) * 5,
    ),
  );

  // Adoption Score (0-100): forks relative to stars + contributor count
  const forkRatio = skill.stars > 0 ? skill.forks / skill.stars : 0;
  const adoption = Math.min(
    100,
    Math.round(
      forkRatio * 60 +
        Math.log2(asFiniteNumber(commitData?.contributors, 0) + 1) * 10 +
        (skill.watchers || 0) * 0.1,
    ),
  );

  // Official Score (0-100): based on verified official sources
  const verifiedEcosystems = skill.ecosystems.filter((e) => e.verified).length;
  const official = Math.min(
    100,
    verifiedEcosystems * 40 + (skill.featured ? 20 : 0),
  );

  // Ecosystem Score (0-100): diversity of ecosystem compatibility
  const ecosystemCount = skill.ecosystems.length;
  const hasMcp = skill.ecosystems.some((e) => e.ecosystem === "mcp");
  const ecosystem = Math.min(
    100,
    ecosystemCount * 15 +
      (hasMcp ? 25 : 0) +
      (skill.relatedMCPs?.length || 0) * 5,
  );

  // Composite Score: weighted combination
  const composite = Math.round(
    popularity * 0.25 +
      activity * 0.25 +
      adoption * 0.2 +
      official * 0.15 +
      ecosystem * 0.15,
  );

  return {
    popularityScore: popularity,
    activityScore: activity,
    adoptionScore: adoption,
    officialScore: official,
    ecosystemScore: ecosystem,
    compositeScore: Math.min(100, Math.max(0, composite)),
  };
}

// ─── Ecosystem summary ──────────────────────────────────────────

export function computeEcosystemBreakdown(skills) {
  const breakdown = {
    claude: 0,
    codex: 0,
    copilot: 0,
    universal: 0,
    huggingface: 0,
    mcp: 0,
  };
  for (const skill of skills) {
    for (const e of skill.ecosystems) {
      if (breakdown[e.ecosystem] !== undefined) {
        breakdown[e.ecosystem]++;
      }
    }
  }
  return breakdown;
}

export function countTotalEcosystemSources(skills) {
  const sources = new Set();
  for (const skill of skills) {
    for (const e of skill.ecosystems) {
      sources.add(e.ecosystem);
    }
  }
  return sources.size;
}
// ─── GitHub Stargazers Timeline ──────────────────────────────

export async function fetchStargazerTimeline(githubFetch, repo) {
  try {
    const url = `${GITHUB_API}/repos/${repo}/stargazers`;
    const payload = await githubFetch(
      url + "?per_page=1&sort=created&direction=asc",
    );
    const firstStar =
      payload?.length > 0
        ? asString(payload[0]?.starred_at || payload[0]?.starredAt || "")
        : "";
    if (!firstStar) return { firstStarDate: null, estimatedTotalStars: 0 };
    const firstDate = Date.parse(firstStar);
    const now = Date.now();
    if (!Number.isFinite(firstDate))
      return { firstStarDate: null, estimatedTotalStars: 0 };
    const daysSinceFirst = (now - firstDate) / 86400000;
    if (daysSinceFirst <= 0)
      return { firstStarDate: null, estimatedTotalStars: 0 };
    const avgStarsPerDay = 1 / Math.max(daysSinceFirst, 1);
    const estimatedTotal = Math.round(avgStarsPerDay * daysSinceFirst * 1.1);
    return {
      firstStarDate: new Date(firstDate).toISOString().slice(0, 10),
      daysSinceFirstStar: Math.round(daysSinceFirst),
      estimatedTotalStars: estimatedTotal,
    };
  } catch {
    return { firstStarDate: null, estimatedTotalStars: 0 };
  }
}

// ─── GitHub Repository Statistics ─────────────────────────────

export async function fetchRepoStatistics(githubFetch, repo) {
  try {
    const url = `${GITHUB_API}/repos/${repo}/stats/participation`;
    const payload = await githubFetch(url);
    const participation = payload?.all || [];
    const last12Weeks = participation.slice(-12);
    const totalCommits12w = last12Weeks.reduce(
      (sum, w) => sum + asFiniteNumber(w?.c, 0),
      0,
    );
    return {
      totalCommitsLast12Weeks: totalCommits12w,
      contributorCount:
        participation.length > 0
          ? Object.keys(participation[0] || {}).filter((k) => k !== "total")
              .length
          : 0,
    };
  } catch {
    return { totalCommitsLast12Weeks: 0, contributorCount: 0 };
  }
}

// ─── Platform classification ──────────────────────────────────

export function classifyPlatform(text) {
  if (/claude|anthropic|\.claude\//i.test(text)) return "claude";
  if (/codex|openai|\.openai\//i.test(text)) return "codex";
  if (/copilot|github[_-]?skill/i.test(text)) return "copilot";
  return "generic";
}

// ─── Safety assessment ────────────────────────────────────────

export function assessSafety(skill) {
  const notes = [];
  let level = "safe";
  if (skill.skillMdPaths.length === 0) {
    notes.push("No SKILL.md file found");
    level = "warning";
  }
  if (skill.openIssues > 100) {
    notes.push("High issue count, possible unresolved problems");
    if (level === "safe") level = "review";
  }
  const daysSincePushed =
    (Date.now() - Date.parse(skill.pushedAt || "2000-01-01")) / 86400000;
  if (daysSincePushed > 730) {
    notes.push("Not updated in over 2 years, may be abandoned");
    level = "warning";
  } else if (daysSincePushed > 365) {
    notes.push("Not updated in over 1 year");
    if (level === "safe") level = "review";
  }
  if (!skill.license || skill.license === "") {
    notes.push("No open source license");
    if (level === "safe") level = "review";
  }
  return { level, notes };
}

// ─── Source tracking ──────────────────────────────────────────

export function buildSourceEntry(source, ok, errors) {
  return {
    source,
    fetchedAt: new Date().toISOString(),
    ok,
    errors: errors || [],
  };
}
