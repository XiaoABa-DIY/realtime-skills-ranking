import type {
  CandidatesPayload,
  SkillRepoSnapshot,
  SnapshotPayload,
} from "../types";

const baseUrl = import.meta.env.BASE_URL;

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`.replace(/\/{2,}/g, "/"));
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function loadSnapshot() {
  return fetchJson<SnapshotPayload>("data/snapshot.json");
}

export async function loadCandidates() {
  return fetchJson<CandidatesPayload>("data/candidates.json");
}

export async function fetchLiveRepository(
  repo: string,
): Promise<Partial<SkillRepoSnapshot>> {
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}`);
  }

  const apiRepo = await response.json();
  return {
    fullName: apiRepo.full_name ?? repo,
    description: apiRepo.description ?? "",
    stars: Number(apiRepo.stargazers_count ?? 0),
    forks: Number(apiRepo.forks_count ?? 0),
    openIssues: Number(apiRepo.open_issues_count ?? 0),
    watchers: Number(apiRepo.subscribers_count ?? apiRepo.watchers_count ?? 0),
    language: apiRepo.language ?? "Unknown",
    license: apiRepo.license?.spdx_id ?? apiRepo.license?.name ?? "NOASSERTION",
    homepage: apiRepo.homepage ?? "",
    htmlUrl: apiRepo.html_url ?? `https://github.com/${repo}`,
    pushedAt: apiRepo.pushed_at ?? "",
    updatedAt: apiRepo.updated_at ?? "",
    archived: Boolean(apiRepo.archived),
    disabled: Boolean(apiRepo.disabled),
    fetchStatus: "ok",
    lastFetchedAt: new Date().toISOString(),
  };
}
