export const favoritesStorageKey = "realtime-skills-ranking:favorites:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function normalizeRepoId(repo: string) {
  return repo.trim().toLowerCase();
}

export function uniqueFavoriteRepos(repos: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const repo of repos) {
    const trimmed = repo.trim();
    const normalized = normalizeRepoId(trimmed);
    if (!trimmed || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(trimmed);
  }

  return unique;
}

export function parseFavoriteRepos(value: string | null) {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return uniqueFavoriteRepos(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return [];
  }
}

export function readFavoriteRepos(storage = getBrowserStorage()) {
  if (!storage) return [];

  try {
    return parseFavoriteRepos(storage.getItem(favoritesStorageKey));
  } catch {
    return [];
  }
}

export function writeFavoriteRepos(
  repos: string[],
  storage: StorageLike | null = getBrowserStorage(),
) {
  const unique = uniqueFavoriteRepos(repos);
  if (!storage) return unique;

  try {
    storage.setItem(favoritesStorageKey, JSON.stringify(unique));
  } catch {
    // Storage can fail in private browsing or restricted test environments.
  }

  return unique;
}

export function toggleFavoriteRepo(repos: string[], repo: string) {
  const normalized = normalizeRepoId(repo);
  const exists = repos.some((item) => normalizeRepoId(item) === normalized);
  if (exists) {
    return repos.filter((item) => normalizeRepoId(item) !== normalized);
  }
  return uniqueFavoriteRepos([...repos, repo]);
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}
