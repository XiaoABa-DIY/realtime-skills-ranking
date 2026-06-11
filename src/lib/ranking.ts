import type {
  CandidateRepo,
  Locale,
  SkillRepoSnapshot,
  SortKey,
} from "../types";

export interface RepoFilters {
  query: string;
  category: string;
  platform: string;
  tag: string;
  license: string;
  language: string;
  sortKey: SortKey;
}

export function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function getFilterOptions(repositories: SkillRepoSnapshot[]) {
  return {
    categories: uniqueSorted(repositories.map((repo) => repo.category)),
    platforms: uniqueSorted(repositories.flatMap((repo) => repo.platforms)),
    tags: uniqueSorted(repositories.flatMap((repo) => repo.tags)),
    licenses: uniqueSorted(repositories.map((repo) => repo.license)),
    languages: uniqueSorted(repositories.map((repo) => repo.language)),
  };
}

function searchableText(repo: SkillRepoSnapshot, locale: Locale) {
  return [
    repo.repo,
    repo.fullName,
    repo.category,
    repo.language,
    repo.license,
    repo.description,
    repo.summary.zh,
    repo.summary.en,
    repo.summary[locale],
    ...repo.platforms,
    ...repo.tags,
  ]
    .join(" ")
    .toLowerCase();
}

export function filterAndSortRepositories(
  repositories: SkillRepoSnapshot[],
  filters: RepoFilters,
  locale: Locale,
) {
  const query = filters.query.trim().toLowerCase();

  return repositories
    .filter((repo) => {
      if (query && !searchableText(repo, locale).includes(query)) return false;
      if (filters.category && repo.category !== filters.category) return false;
      if (filters.platform && !repo.platforms.includes(filters.platform))
        return false;
      if (filters.tag && !repo.tags.includes(filters.tag)) return false;
      if (filters.license && repo.license !== filters.license) return false;
      if (filters.language && repo.language !== filters.language) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sortKey === "forks")
        return b.forks - a.forks || a.repo.localeCompare(b.repo);
      if (filters.sortKey === "updated") {
        return Date.parse(b.updatedAt || "0") - Date.parse(a.updatedAt || "0");
      }
      if (filters.sortKey === "name") return a.repo.localeCompare(b.repo);
      return b.stars - a.stars || a.repo.localeCompare(b.repo);
    });
}

export function calculateStats(
  repositories: SkillRepoSnapshot[],
  generatedAt: string,
) {
  return {
    totalRepos: repositories.length,
    totalStars: repositories.reduce((sum, repo) => sum + repo.stars, 0),
    totalCategories: new Set(repositories.map((repo) => repo.category)).size,
    generatedAt,
  };
}

export function topCandidates(candidates: CandidateRepo[], limit = 8) {
  return [...candidates]
    .filter(
      (candidate) =>
        !candidate.alreadyCurated && candidate.fetchStatus !== "error",
    )
    .sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo))
    .slice(0, limit);
}
