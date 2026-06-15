import { describe, expect, it, vi } from "vitest";
import {
  favoritesStorageKey,
  parseFavoriteRepos,
  readFavoriteRepos,
  toggleFavoriteRepo,
  writeFavoriteRepos,
} from "./favorites";

describe("favorite repository helpers", () => {
  it("parses stored favorites defensively", () => {
    expect(parseFavoriteRepos('["alpha/agents","alpha/agents",""]')).toEqual([
      "alpha/agents",
    ]);
    expect(parseFavoriteRepos("{broken")).toEqual([]);
    expect(parseFavoriteRepos('{"repo":"alpha/agents"}')).toEqual([]);
  });

  it("toggles favorites without duplicates", () => {
    expect(toggleFavoriteRepo(["alpha/agents"], "beta/media")).toEqual([
      "alpha/agents",
      "beta/media",
    ]);
    expect(toggleFavoriteRepo(["alpha/agents"], "ALPHA/agents")).toEqual([]);
  });

  it("reads and writes through storage when available", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };

    writeFavoriteRepos(["alpha/agents", "alpha/agents"], storage);

    expect(storage.setItem).toHaveBeenCalledWith(
      favoritesStorageKey,
      JSON.stringify(["alpha/agents"]),
    );
    expect(readFavoriteRepos(storage)).toEqual(["alpha/agents"]);
  });
});
