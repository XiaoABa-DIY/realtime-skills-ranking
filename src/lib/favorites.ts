export const favoritesStorageKey = "github-skills-ranking:favorites:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function normalizeSkillId(repo: string) {
  return repo.trim().toLowerCase();
}

export function uniqueFavoriteSkills(repos: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const repo of repos) {
    const trimmed = repo.trim();
    const normalized = normalizeSkillId(trimmed);
    if (!trimmed || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(trimmed);
  }

  return unique;
}

export function parseFavoriteSkills(value: string | null) {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return uniqueFavoriteSkills(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return [];
  }
}

export function readFavoriteSkills(storage = getBrowserStorage()) {
  if (!storage) return [];

  try {
    return parseFavoriteSkills(storage.getItem(favoritesStorageKey));
  } catch {
    return [];
  }
}

export function writeFavoriteSkills(
  repos: string[],
  storage: StorageLike | null = getBrowserStorage(),
) {
  const unique = uniqueFavoriteSkills(repos);
  if (!storage) return unique;

  try {
    storage.setItem(favoritesStorageKey, JSON.stringify(unique));
  } catch {
    // Storage can fail in private browsing or restricted test environments.
  }

  return unique;
}

export function toggleFavoriteSkill(repos: string[], repo: string) {
  const normalized = normalizeSkillId(repo);
  const exists = repos.some((item) => normalizeSkillId(item) === normalized);
  if (exists) {
    return repos.filter((item) => normalizeSkillId(item) !== normalized);
  }
  return uniqueFavoriteSkills([...repos, repo]);
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}
