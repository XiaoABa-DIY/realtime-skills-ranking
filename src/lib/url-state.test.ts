import { describe, expect, it } from "vitest";
import { buildSearchParams, parseUrlState } from "./url-state";
import { defaultSkillFilters } from "./ranking";

describe("url state helpers", () => {
  it("parses supported RedFox skill filters from query strings", () => {
    const state = parseUrlState(
      "?lang=en&q=douyin&audience=douyin&spotlight=topUses&sort=views&favorites=1&skill=douyin-search",
    );

    expect(state.locale).toBe("en");
    expect(state.selectedSkill).toBe("douyin-search");
    expect(state.filters).toMatchObject({
      query: "douyin",
      audience: "douyin",
      spotlight: "topUses",
      sortKey: "views",
      favoritesOnly: true,
    });
  });

  it("keeps old repo detail links as a compatibility fallback", () => {
    expect(parseUrlState("?repo=multi-wordcheck").selectedSkill).toBe(
      "multi-wordcheck",
    );
  });

  it("serializes only non-default state for shareable links", () => {
    expect(
      buildSearchParams(
        {
          ...defaultSkillFilters,
          audience: "media",
          tag: "内容改写",
          favoritesOnly: true,
        },
        "zh",
        "multi-wordcheck",
      ),
    ).toBe(
      "?tag=%E5%86%85%E5%AE%B9%E6%94%B9%E5%86%99&audience=media&favorites=1&skill=multi-wordcheck",
    );
  });

  it("parses and serializes trend spotlight links", () => {
    const state = parseUrlState("?spotlight=growth7d&sort=uses");

    expect(state.filters.spotlight).toBe("growth7d");
    expect(
      buildSearchParams(
        { ...defaultSkillFilters, spotlight: "rankRisers" },
        "en",
      ),
    ).toBe("?lang=en&spotlight=rankRisers");
  });
});
