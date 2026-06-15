import type { Locale, SortKey } from "../types";
import {
  audienceKeys,
  defaultRepoFilters,
  spotlightKeys,
  type RepoFilters,
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
  filters: RepoFilters;
  locale: Locale;
  selectedRepo: string;
}

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const sortKey = oneOf(params.get("sort"), sortKeys) || "stars";
  const locale = oneOf(params.get("lang"), locales) || "zh";

  return {
    locale,
    selectedRepo: safeValue(params.get("repo")),
    filters: {
      ...defaultRepoFilters,
      query: safeValue(params.get("q")),
      category: safeValue(params.get("category")),
      platform: safeValue(params.get("platform")),
      tag: safeValue(params.get("tag")),
      license: safeValue(params.get("license")),
      language: safeValue(params.get("language")),
      sortKey,
      audience:
        oneOf(params.get("audience"), audienceKeys) ||
        defaultRepoFilters.audience,
      spotlight:
        oneOf(params.get("spotlight"), spotlightKeys) ||
        defaultRepoFilters.spotlight,
      favoritesOnly: params.get("favorites") === "1",
    },
  };
}

export function buildSearchParams(
  filters: RepoFilters,
  locale: Locale,
  selectedRepo = "",
) {
  const params = new URLSearchParams();

  if (locale !== "zh") params.set("lang", locale);
  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.license) params.set("license", filters.license);
  if (filters.language) params.set("language", filters.language);
  if (filters.sortKey !== "stars") params.set("sort", filters.sortKey);
  if (filters.audience) params.set("audience", filters.audience);
  if (filters.spotlight) params.set("spotlight", filters.spotlight);
  if (filters.favoritesOnly) params.set("favorites", "1");
  if (selectedRepo) params.set("repo", selectedRepo);

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function makeShareUrl(
  baseHref: string,
  filters: RepoFilters,
  locale: Locale,
  selectedRepo = "",
) {
  const url = new URL(baseHref);
  url.search = buildSearchParams(filters, locale, selectedRepo);
  return url.toString();
}
