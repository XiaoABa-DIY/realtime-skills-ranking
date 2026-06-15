import { describe, expect, it } from "vitest";
import { buildSearchParams, parseUrlState } from "./url-state";
import { defaultRepoFilters } from "./ranking";

describe("url state helpers", () => {
  it("parses supported filters from query strings", () => {
    const state = parseUrlState(
      "?lang=en&q=mcp&audience=developer&spotlight=developerStack&sort=updated&favorites=1&repo=modelcontextprotocol%2Fservers",
    );

    expect(state.locale).toBe("en");
    expect(state.selectedRepo).toBe("modelcontextprotocol/servers");
    expect(state.filters).toMatchObject({
      query: "mcp",
      audience: "developer",
      spotlight: "developerStack",
      sortKey: "updated",
      favoritesOnly: true,
    });
  });

  it("serializes only non-default state for shareable links", () => {
    expect(
      buildSearchParams(
        {
          ...defaultRepoFilters,
          audience: "creator",
          tag: "tts",
          favoritesOnly: true,
        },
        "zh",
        "fishaudio/fish-speech",
      ),
    ).toBe(
      "?tag=tts&audience=creator&favorites=1&repo=fishaudio%2Ffish-speech",
    );
  });
});
