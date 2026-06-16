export const favoritesStorageKey = "redfox-skills-ranking:favorites:v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function normalizeSkillId(skillCode: string) {
  return skillCode.trim().toLowerCase();
}

export function uniqueFavoriteSkills(skillCodes: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const skillCode of skillCodes) {
    const trimmed = skillCode.trim();
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
  skillCodes: string[],
  storage: StorageLike | null = getBrowserStorage(),
) {
  const unique = uniqueFavoriteSkills(skillCodes);
  if (!storage) return unique;

  try {
    storage.setItem(favoritesStorageKey, JSON.stringify(unique));
  } catch {
    // Storage can fail in private browsing or restricted test environments.
  }

  return unique;
}

export function toggleFavoriteSkill(skillCodes: string[], skillCode: string) {
  const normalized = normalizeSkillId(skillCode);
  const exists = skillCodes.some(
    (item) => normalizeSkillId(item) === normalized,
  );
  if (exists) {
    return skillCodes.filter((item) => normalizeSkillId(item) !== normalized);
  }
  return uniqueFavoriteSkills([...skillCodes, skillCode]);
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}
