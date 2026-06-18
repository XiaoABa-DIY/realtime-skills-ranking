import type { Locale, SortKey } from "../types";
import {
  audienceKeys,
  defaultSkillFilters,
  spotlightKeys,
  type SkillFilters,
} from "./ranking";

const sortKeys: SortKey[] = ["stars", "forks", "updated", "name"];
const locales: Locale[] = ["zh", "en"];

function safeValue(value: string | null) {
  return value?.trim() ?? "";
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]) {
  const normalized = safeValue(value);
  return allowed.includes(normalized as T) ? (normalized as T) : "";
}

export interface UrlState {
  filters: SkillFilters;
  locale: Locale;
  selectedSkill: string;
}

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const sortKey = oneOf(params.get("sort"), sortKeys) || "stars";
  const locale = oneOf(params.get("lang"), locales) || "zh";

  return {
    locale,
    selectedSkill:
      safeValue(params.get("skill")) || safeValue(params.get("repo")),
    filters: {
      ...defaultSkillFilters,
      query: safeValue(params.get("q")),
      category: safeValue(params.get("category")),
      tag: safeValue(params.get("tag")),
      sortKey,
      audience:
        oneOf(params.get("audience"), audienceKeys) ||
        defaultSkillFilters.audience,
      spotlight:
        oneOf(params.get("spotlight"), spotlightKeys) ||
        defaultSkillFilters.spotlight,
      favoritesOnly: params.get("favorites") === "1",
    },
  };
}

export function buildSearchParams(
  filters: SkillFilters,
  locale: Locale,
  selectedSkill = "",
) {
  const params = new URLSearchParams();

  if (locale !== "zh") params.set("lang", locale);
  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.sortKey !== "stars") params.set("sort", filters.sortKey);
  if (filters.audience) params.set("audience", filters.audience);
  if (filters.spotlight) params.set("spotlight", filters.spotlight);
  if (filters.favoritesOnly) params.set("favorites", "1");
  if (selectedSkill) params.set("skill", selectedSkill);

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function makeShareUrl(
  baseHref: string,
  filters: SkillFilters,
  locale: Locale,
  selectedSkill = "",
) {
  const url = new URL(baseHref);
  url.search = buildSearchParams(filters, locale, selectedSkill);
  return url.toString();
}
