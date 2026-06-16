import { describe, expect, it, vi } from "vitest";
import {
  favoritesStorageKey,
  parseFavoriteSkills,
  readFavoriteSkills,
  toggleFavoriteSkill,
  writeFavoriteSkills,
} from "./favorites";

describe("favorite skill helpers", () => {
  it("parses stored favorites defensively", () => {
    expect(parseFavoriteSkills('["douyin-search","douyin-search",""]')).toEqual(
      ["douyin-search"],
    );
    expect(parseFavoriteSkills("{broken")).toEqual([]);
    expect(parseFavoriteSkills('{"skill":"douyin-search"}')).toEqual([]);
  });

  it("toggles favorites without duplicates", () => {
    expect(toggleFavoriteSkill(["douyin-search"], "multi-wordcheck")).toEqual([
      "douyin-search",
      "multi-wordcheck",
    ]);
    expect(toggleFavoriteSkill(["douyin-search"], "DOUYIN-SEARCH")).toEqual([]);
  });

  it("reads and writes through storage when available", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };

    writeFavoriteSkills(["douyin-search", "douyin-search"], storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      favoritesStorageKey,
      JSON.stringify(["douyin-search"]),
    );
    expect(readFavoriteSkills(storage)).toEqual(["douyin-search"]);
  });
});
