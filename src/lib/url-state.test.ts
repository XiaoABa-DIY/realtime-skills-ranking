import { describe, expect, it } from "vitest";
import { buildSearchParams, parseUrlState } from "./url-state";
import { defaultSkillFilters } from "./ranking";

describe("url state helpers", () => {
  it("parses supported GitHub skill filters from query strings", () => {
    const state = parseUrlState(
      "?lang=en&q=writing&audience=media&spotlight=featured&sort=forks&favorites=1&skill=owner%2Fcontent-skill",
    );

    expect(state.locale).toBe("en");
    expect(state.selectedSkill).toBe("owner/content-skill");
    expect(state.filters).toMatchObject({
      query: "writing",
      audience: "media",
      spotlight: "featured",
      sortKey: "forks",
      favoritesOnly: true,
    });
  });

  it("keeps old repo detail links as a compatibility fallback", () => {
    expect(parseUrlState("?repo=owner%2Fresearch-skill").selectedSkill).toBe(
      "owner/research-skill",
    );
  });

  it("serializes only non-default state for shareable links", () => {
    expect(
      buildSearchParams(
        {
          ...defaultSkillFilters,
          audience: "media",
          tag: "写作",
          favoritesOnly: true,
        },
        "zh",
        "owner/content-skill",
      ),
    ).toBe(
      "?tag=%E5%86%99%E4%BD%9C&audience=media&favorites=1&skill=owner%2Fcontent-skill",
    );
  });

  it("parses and serializes GitHub trend spotlight links", () => {
    const state = parseUrlState("?spotlight=growth7d&sort=stars");

    expect(state.filters.spotlight).toBe("growth7d");
    expect(
      buildSearchParams(
        { ...defaultSkillFilters, spotlight: "rankRisers" },
        "en",
      ),
    ).toBe("?lang=en&spotlight=rankRisers");
  });

  it("parses and serializes radar score sort links", () => {
    expect(parseUrlState("?sort=radarScore").filters.sortKey).toBe(
      "radarScore",
    );
    expect(parseUrlState("?sort=growth").filters.sortKey).toBe("growth");
    expect(parseUrlState("?sort=ecosystem").filters.sortKey).toBe("ecosystem");
    expect(
      buildSearchParams({ ...defaultSkillFilters, sortKey: "composite" }, "zh"),
    ).toBe("?sort=composite");
  });
});
