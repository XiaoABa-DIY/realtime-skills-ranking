import { describe, expect, it, vi } from "vitest";
import {
  favoritesStorageKey,
  parseFavoriteSkills,
  readFavoriteSkills,
  toggleFavoriteSkill,
  writeFavoriteSkills,
} from "./favorites";

describe("favorite skill helpers", () => {
  it("uses a GitHub repo scoped storage key", () => {
    expect(favoritesStorageKey).toBe("github-skills-ranking:favorites:v1");
  });

  it("parses stored favorites defensively", () => {
    expect(
      parseFavoriteSkills('["owner/content-skill","OWNER/content-skill",""]'),
    ).toEqual(["owner/content-skill"]);
    expect(parseFavoriteSkills("{broken")).toEqual([]);
    expect(parseFavoriteSkills('{"repo":"owner/content-skill"}')).toEqual([]);
  });

  it("toggles favorites without duplicates", () => {
    expect(
      toggleFavoriteSkill(["owner/content-skill"], "owner/research-skill"),
    ).toEqual(["owner/content-skill", "owner/research-skill"]);
    expect(
      toggleFavoriteSkill(["owner/content-skill"], "OWNER/content-skill"),
    ).toEqual([]);
  });

  it("reads and writes through storage when available", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };

    writeFavoriteSkills(
      ["owner/content-skill", "OWNER/content-skill"],
      storage,
    );

    expect(storage.setItem).toHaveBeenCalledWith(
      favoritesStorageKey,
      JSON.stringify(["owner/content-skill"]),
    );
    expect(readFavoriteSkills(storage)).toEqual(["owner/content-skill"]);
  });
});
