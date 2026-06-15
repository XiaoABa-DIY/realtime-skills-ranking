import {
  ArrowDownWideNarrow,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Code2,
  Compass,
  Copy,
  ExternalLink,
  Filter,
  Flame,
  Languages,
  Link2,
  RefreshCcw,
  Rocket,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "./App.css";
import { t } from "./i18n";
import { loadCandidates, loadSnapshot, fetchLiveRepository } from "./lib/data";
import {
  normalizeRepoId,
  readFavoriteRepos,
  toggleFavoriteRepo,
  writeFavoriteRepos,
} from "./lib/favorites";
import { formatDate, formatDateTime, formatNumber } from "./lib/format";
import {
  audienceKeys,
  audienceProfiles,
  buildQualitySignals,
  calculateStats,
  defaultRepoFilters,
  deriveUseCases,
  enrichRepositories,
  filterAndSortRepositories,
  getFilterOptions,
  getRelatedRepositories,
  inferAudiences,
  inferFreshness,
  matchesAudience,
  spotlightKeys,
  spotlightViews,
  topCandidates,
  type RepoFilters,
} from "./lib/ranking";
import {
  buildSearchParams,
  makeShareUrl,
  parseUrlState,
} from "./lib/url-state";
import type {
  AudienceKey,
  CandidateRepo,
  CandidatesPayload,
  Locale,
  SkillRepoSnapshot,
  SnapshotPayload,
  SortKey,
  SpotlightKey,
} from "./types";

const emptySnapshot: SnapshotPayload = {
  generatedAt: "",
  source: "empty",
  repositories: [],
};

const emptyCandidates: CandidatesPayload = {
  generatedAt: "",
  source: "empty",
  candidates: [],
};

const issueTemplateUrl =
  "https://github.com/XiaoABa-DIY/realtime-skills-ranking/issues/new?template=skill-recommendation.yml";

type QuickFilterKey =
  | "developerTools"
  | "creatorTools"
  | "mcpTools"
  | "researchRag"
  | "beginnerFriendly"
  | "recentlyActive";

const quickFilterKeys: QuickFilterKey[] = [
  "developerTools",
  "creatorTools",
  "mcpTools",
  "researchRag",
  "beginnerFriendly",
  "recentlyActive",
];

function getInitialState() {
  if (typeof window === "undefined") {
    return {
      locale: "zh" as Locale,
      filters: defaultRepoFilters,
      selectedRepo: "",
    };
  }
  return parseUrlState(window.location.search);
}

function SelectField({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  meta,
  active,
  onClick,
}: {
  title: string;
  description: string;
  meta?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "toggle-card active" : "toggle-card"}
      aria-pressed={active}
      onClick={onClick}
    >
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      {meta ? <em>{meta}</em> : null}
    </button>
  );
}

function FavoriteButton({
  active,
  locale,
  compact = false,
  onClick,
}: {
  active: boolean;
  locale: Locale;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? `favorite-button active${compact ? " compact" : ""}`
          : `favorite-button${compact ? " compact" : ""}`
      }
      aria-pressed={active}
      aria-label={
        active ? t(locale, "removeFavorite") : t(locale, "addFavorite")
      }
      title={active ? t(locale, "removeFavorite") : t(locale, "addFavorite")}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {active ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      {compact ? null : active ? t(locale, "favorited") : t(locale, "favorite")}
    </button>
  );
}

function RepoBadges({
  repo,
  locale,
}: {
  repo: SkillRepoSnapshot;
  locale: Locale;
}) {
  const freshness = repo.freshness ?? inferFreshness(repo);
  const audiences = inferAudiences(repo).slice(0, 2);

  return (
    <div className="badge-row">
      {repo.featured ? (
        <span className="badge accent">{t(locale, "featured")}</span>
      ) : null}
      <span className={`badge freshness ${freshness}`}>
        {t(locale, `freshness${capitalize(freshness)}` as never)}
      </span>
      {repo.archived ? (
        <span className="badge warning">{t(locale, "archived")}</span>
      ) : null}
      {repo.fetchStatus === "error" ? (
        <span className="badge danger">{t(locale, "error")}</span>
      ) : null}
      {audiences.map((audience) => (
        <span className="badge audience" key={audience}>
          {audienceProfiles[audience].label[locale]}
        </span>
      ))}
      {repo.tags.slice(0, 2).map((tag) => (
        <span className="badge" key={tag}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function RepositoryTable({
  repositories,
  locale,
  favoriteRepos,
  onSelect,
  onToggleFavorite,
}: {
  repositories: SkillRepoSnapshot[];
  locale: Locale;
  favoriteRepos: ReadonlySet<string>;
  onSelect: (repo: SkillRepoSnapshot) => void;
  onToggleFavorite: (repo: SkillRepoSnapshot) => void;
}) {
  return (
    <>
      <div className="table-wrap desktop-table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{t(locale, "repository")}</th>
              <th>{t(locale, "skillFit")}</th>
              <th>{t(locale, "stars")}</th>
              <th>{t(locale, "updatedAt")}</th>
              <th>{t(locale, "actions")}</th>
            </tr>
          </thead>
          <tbody>
            {repositories.map((repo, index) => (
              <tr
                key={repo.repo}
                className={(repo.rank ?? index + 1) <= 3 ? "top-row" : ""}
                onClick={() => onSelect(repo)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(repo);
                  }
                }}
                tabIndex={0}
              >
                <td className="rank-cell" data-label="#">
                  <span>{repo.rank ?? index + 1}</span>
                </td>
                <td className="repo-data" data-label={t(locale, "repository")}>
                  <div className="repo-cell">
                    <strong>{repo.repo}</strong>
                    <span>{repo.summary[locale]}</span>
                    <RepoBadges repo={repo} locale={locale} />
                  </div>
                </td>
                <td data-label={t(locale, "skillFit")}>
                  <div className="fit-cell">
                    <strong>{repo.category}</strong>
                    <span>
                      {deriveUseCases(repo)
                        .slice(0, 1)
                        .map((useCase) => useCase[locale])
                        .join("")}
                    </span>
                  </div>
                </td>
                <td className="number-cell" data-label={t(locale, "stars")}>
                  <Star size={14} />
                  {formatNumber(repo.stars, locale)}
                </td>
                <td data-label={t(locale, "updatedAt")}>
                  {formatDate(repo.updatedAt, locale)}
                </td>
                <td data-label={t(locale, "actions")}>
                  <div className="row-actions">
                    <FavoriteButton
                      compact
                      active={favoriteRepos.has(repo.repo.toLowerCase())}
                      locale={locale}
                      onClick={() => onToggleFavorite(repo)}
                    />
                    <button
                      type="button"
                      className="detail-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(repo);
                      }}
                    >
                      {t(locale, "viewDetails")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-repo-list">
        {repositories.map((repo, index) => (
          <MobileRepoCard
            key={repo.repo}
            repo={repo}
            locale={locale}
            rank={repo.rank ?? index + 1}
            favorite={favoriteRepos.has(repo.repo.toLowerCase())}
            onSelect={() => onSelect(repo)}
            onToggleFavorite={() => onToggleFavorite(repo)}
          />
        ))}
      </div>
    </>
  );
}

function MobileRepoCard({
  repo,
  locale,
  rank,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  repo: SkillRepoSnapshot;
  locale: Locale;
  rank: number;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <article
      className={rank <= 3 ? "mobile-repo-card top-card" : "mobile-repo-card"}
    >
      <button type="button" className="mobile-card-main" onClick={onSelect}>
        <span className="rank-medal">#{rank}</span>
        <span>
          <strong>{repo.repo}</strong>
          <small>{repo.summary[locale]}</small>
        </span>
      </button>
      <RepoBadges repo={repo} locale={locale} />
      <div className="mobile-card-meta">
        <span>
          <Star size={14} />
          {formatNumber(repo.stars, locale)}
        </span>
        <span>{repo.language}</span>
        <span>{formatDate(repo.updatedAt, locale)}</span>
      </div>
      <div className="mobile-card-actions">
        <FavoriteButton
          active={favorite}
          locale={locale}
          onClick={onToggleFavorite}
        />
        <button type="button" className="detail-link" onClick={onSelect}>
          {t(locale, "viewDetails")}
        </button>
      </div>
    </article>
  );
}

function HeroSection({
  locale,
  source,
  generatedAt,
  stale,
  topRepos,
  onStartExplore,
  onWeeklyHot,
  onRecommendSkill,
  onSelectRepo,
}: {
  locale: Locale;
  source: string;
  generatedAt: string;
  stale: boolean;
  topRepos: SkillRepoSnapshot[];
  onStartExplore: () => void;
  onWeeklyHot: () => void;
  onRecommendSkill: () => void;
  onSelectRepo: (repo: SkillRepoSnapshot) => void;
}) {
  return (
    <section className="hero-panel product-hero">
      <div className="hero-copy">
        <p className="eyebrow">{t(locale, "officialOnly")}</p>
        <h2>{t(locale, "heroTitle")}</h2>
        <p>{t(locale, "heroLead")}</p>
        <div className="hero-cta">
          <button
            type="button"
            className="primary-button"
            onClick={onStartExplore}
          >
            <Compass size={16} />
            {t(locale, "startExploring")}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onWeeklyHot}
          >
            <Flame size={16} />
            {t(locale, "viewWeeklyHot")}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onRecommendSkill}
          >
            <ExternalLink size={16} />
            {t(locale, "contributeSkill")}
          </button>
        </div>
        <div className={stale ? "freshness-strip warning" : "freshness-strip"}>
          {stale ? <AlertTriangle size={15} /> : <RefreshCcw size={15} />}
          <span>
            {stale ? t(locale, "dataMayBeStale") : t(locale, "lastRefresh")}:{" "}
            {generatedAt ? formatDateTime(generatedAt, locale) : "-"}
          </span>
          <b>{source}</b>
        </div>
      </div>

      <div className="top-three-panel" aria-label={t(locale, "topThree")}>
        <div className="top-three-head">
          <Trophy size={18} />
          <strong>{t(locale, "topThree")}</strong>
        </div>
        {topRepos.map((repo, index) => (
          <button
            type="button"
            className={`top-skill-card rank-${index + 1}`}
            key={repo.repo}
            onClick={() => onSelectRepo(repo)}
          >
            <span className="top-rank">#{index + 1}</span>
            <span>
              <strong>{repo.repo}</strong>
              <small>{repo.summary[locale]}</small>
            </span>
            <em>
              <Star size={13} />
              {formatNumber(repo.stars, locale)}
            </em>
          </button>
        ))}
      </div>
    </section>
  );
}

function FeaturedSkillCards({
  picks,
  locale,
  favoriteRepos,
  onSelect,
  onToggleFavorite,
}: {
  picks: RecommendedPick[];
  locale: Locale;
  favoriteRepos: ReadonlySet<string>;
  onSelect: (repo: SkillRepoSnapshot) => void;
  onToggleFavorite: (repo: SkillRepoSnapshot) => void;
}) {
  if (picks.length === 0) return null;

  return (
    <section className="featured-section" aria-labelledby="featured-title">
      <div className="section-head">
        <div>
          <p>{t(locale, "todayPicksEyebrow")}</p>
          <h2 id="featured-title">
            <Rocket size={20} />
            {t(locale, "todayPicks")}
          </h2>
          <span className="section-note">{t(locale, "todayPicksLead")}</span>
        </div>
      </div>
      <div className="featured-grid">
        {picks.map((pick) => (
          <SkillPickCard
            key={pick.key}
            pick={pick}
            locale={locale}
            favorite={favoriteRepos.has(pick.repo.repo.toLowerCase())}
            onSelect={() => onSelect(pick.repo)}
            onToggleFavorite={() => onToggleFavorite(pick.repo)}
          />
        ))}
      </div>
    </section>
  );
}

interface RecommendedPick {
  key: "topOverall" | "developerPick" | "creatorPick" | "mcpPick";
  repo: SkillRepoSnapshot;
}

function SkillPickCard({
  pick,
  locale,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  pick: RecommendedPick;
  locale: Locale;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const repo = pick.repo;
  return (
    <article className="skill-pick-card">
      <button type="button" className="skill-pick-main" onClick={onSelect}>
        <span className="pick-label">{t(locale, pick.key)}</span>
        <strong>{repo.repo}</strong>
        <small>{repo.summary[locale]}</small>
      </button>
      <RepoBadges repo={repo} locale={locale} />
      <div className="pick-stats">
        <span>
          <Star size={14} />
          {formatNumber(repo.stars, locale)}
        </span>
        <span>
          <Code2 size={14} />
          {formatNumber(repo.forks, locale)}
        </span>
        <span>{repo.category}</span>
      </div>
      <div className="pick-actions">
        <button type="button" className="detail-link" onClick={onSelect}>
          {t(locale, "viewDetails")}
        </button>
        <a
          className="detail-link github"
          href={repo.htmlUrl}
          target="_blank"
          rel="noreferrer"
        >
          {t(locale, "openGithub")}
        </a>
        <FavoriteButton
          compact
          active={favorite}
          locale={locale}
          onClick={onToggleFavorite}
        />
      </div>
    </article>
  );
}

function QuickFilterChips({
  locale,
  filters,
  onSelect,
}: {
  locale: Locale;
  filters: RepoFilters;
  onSelect: (key: QuickFilterKey) => void;
}) {
  return (
    <section
      className="quick-filter-panel"
      aria-labelledby="quick-filter-title"
    >
      <div className="section-head compact">
        <div>
          <p>{t(locale, "quickStartEyebrow")}</p>
          <h2 id="quick-filter-title">{t(locale, "quickStartTitle")}</h2>
        </div>
      </div>
      <div className="quick-chip-row">
        {quickFilterKeys.map((key) => (
          <button
            type="button"
            key={key}
            className={
              isQuickFilterActive(key, filters)
                ? "quick-chip active"
                : "quick-chip"
            }
            aria-pressed={isQuickFilterActive(key, filters)}
            onClick={() => onSelect(key)}
          >
            {t(locale, key)}
          </button>
        ))}
      </div>
    </section>
  );
}

function EmptyRankingState({
  locale,
  onClear,
  onSearch,
}: {
  locale: Locale;
  onClear: () => void;
  onSearch: (query: string) => void;
}) {
  return (
    <div className="empty-state rich-empty">
      <strong>{t(locale, "noResultsTitle")}</strong>
      <p>{t(locale, "noResultsHint")}</p>
      <div className="empty-actions">
        <button type="button" className="secondary-button" onClick={onClear}>
          <SlidersHorizontal size={16} />
          {t(locale, "clearFilters")}
        </button>
        {["agent", "mcp", "rag"].map((query) => (
          <button
            type="button"
            className="detail-link"
            key={query}
            onClick={() => onSearch(query)}
          >
            {query}
          </button>
        ))}
        <a className="detail-link github" href={issueTemplateUrl}>
          {t(locale, "contributeSkill")}
        </a>
      </div>
    </div>
  );
}

function CandidateList({
  candidates,
  locale,
}: {
  candidates: CandidateRepo[];
  locale: Locale;
}) {
  if (candidates.length === 0) {
    return <p className="muted">{t(locale, "noResults")}</p>;
  }

  return (
    <div className="candidate-list">
      {candidates.map((candidate) => {
        const suggestedAudiences = getCandidateAudiences(candidate);
        const confidence =
          candidate.confidence ?? inferCandidateConfidence(candidate);

        return (
          <a
            className="candidate-item"
            href={candidate.htmlUrl}
            key={`${candidate.matchedQuery}-${candidate.repo}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              <strong>{candidate.repo}</strong>
              <small>
                {candidate.suggestedCategory ?? candidate.category} ·{" "}
                {t(locale, "whyCandidate")}: {candidate.reason[locale]}
              </small>
              <span className="candidate-meta">
                {suggestedAudiences.slice(0, 2).map((audience) => (
                  <b key={audience}>
                    {audienceProfiles[audience].label[locale]}
                  </b>
                ))}
                <b>
                  {t(locale, "confidence")} {confidence}%
                </b>
              </span>
            </span>
            <span className="candidate-stars">
              <Star size={14} />
              {formatNumber(candidate.stars, locale)}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function DetailDrawer({
  repo,
  repositories,
  locale,
  status,
  favorite,
  onRefresh,
  onClose,
  onShare,
  onToggleFavorite,
  onSelectRelated,
}: {
  repo: SkillRepoSnapshot | null;
  repositories: SkillRepoSnapshot[];
  locale: Locale;
  status: "idle" | "loading" | "success" | "error";
  favorite: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onShare: (repoId: string) => void;
  onToggleFavorite: (repo: SkillRepoSnapshot) => void;
  onSelectRelated: (repo: SkillRepoSnapshot) => void;
}) {
  useEffect(() => {
    if (!repo) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, repo]);

  if (!repo) return null;

  const audiences = inferAudiences(repo);
  const useCases = deriveUseCases(repo);
  const related = getRelatedRepositories(repo, repositories, 4);
  const quality = repo.qualitySignals ?? buildQualitySignals(repo);
  const freshness = repo.freshness ?? inferFreshness(repo);

  return (
    <>
      <div className="drawer-backdrop" aria-hidden="true" onClick={onClose} />
      <aside
        className="drawer"
        aria-labelledby="drawer-title"
        aria-modal="true"
        role="dialog"
      >
        <div className="drawer-head">
          <div>
            <p>{repo.category}</p>
            <h2 id="drawer-title">{repo.repo}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            title={t(locale, "close")}
            aria-label={t(locale, "close")}
          >
            <X size={18} />
          </button>
        </div>

        <p className="drawer-summary">{repo.summary[locale]}</p>
        {repo.description ? <p className="muted">{repo.description}</p> : null}

        <div className="drawer-actions">
          <a
            className="primary-button"
            href={repo.htmlUrl}
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={16} />
            {t(locale, "openGithub")}
          </a>
          {repo.homepage ? (
            <a
              className="secondary-button"
              href={repo.homepage}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              {t(locale, "homepage")}
            </a>
          ) : null}
          <button
            type="button"
            className="secondary-button"
            onClick={() => onShare(repo.repo)}
          >
            <Link2 size={16} />
            {t(locale, "shareSkill")}
          </button>
          <FavoriteButton
            active={favorite}
            locale={locale}
            onClick={() => onToggleFavorite(repo)}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={onRefresh}
            disabled={status === "loading"}
          >
            <RefreshCcw size={16} />
            {status === "loading"
              ? t(locale, "refreshing")
              : t(locale, "realtimeRefresh")}
          </button>
        </div>

        {status === "success" ? (
          <p className="notice success">{t(locale, "liveUpdated")}</p>
        ) : null}
        {status === "error" ? (
          <p className="notice error">{t(locale, "snapshotFallback")}</p>
        ) : null}
        {repo.fetchStatus === "error" ? (
          <p className="notice error">{repo.errorMessage}</p>
        ) : null}

        <dl className="detail-grid">
          <div>
            <dt>{t(locale, "globalRankLabel")}</dt>
            <dd>#{repo.rank ?? "-"}</dd>
          </div>
          <div>
            <dt>{t(locale, "rankInCategory")}</dt>
            <dd>#{repo.rankByCategory ?? "-"}</dd>
          </div>
          <div>
            <dt>{t(locale, "stars")}</dt>
            <dd>{formatNumber(repo.stars, locale)}</dd>
          </div>
          <div>
            <dt>{t(locale, "forks")}</dt>
            <dd>{formatNumber(repo.forks, locale)}</dd>
          </div>
          <div>
            <dt>{t(locale, "dataFreshness")}</dt>
            <dd>{t(locale, `freshness${capitalize(freshness)}` as never)}</dd>
          </div>
          <div>
            <dt>{t(locale, "updatedAt")}</dt>
            <dd>{formatDateTime(repo.updatedAt, locale)}</dd>
          </div>
          <div>
            <dt>{t(locale, "language")}</dt>
            <dd>{repo.language}</dd>
          </div>
          <div>
            <dt>{t(locale, "license")}</dt>
            <dd>{repo.license}</dd>
          </div>
        </dl>

        <section className="drawer-section">
          <h3>{t(locale, "skillFit")}</h3>
          <div className="badge-row">
            {audiences.map((audience) => (
              <span className="badge accent" key={audience}>
                {audienceProfiles[audience].label[locale]}
              </span>
            ))}
          </div>
        </section>

        <section className="drawer-section">
          <h3>{t(locale, "useCases")}</h3>
          <ul className="plain-list">
            {useCases.map((useCase) => (
              <li key={useCase.en}>{useCase[locale]}</li>
            ))}
          </ul>
        </section>

        <section className="drawer-section">
          <h3>{t(locale, "whyListed")}</h3>
          <ul className="plain-list">
            <li>
              #{repo.rank ?? "-"} {t(locale, "officialOnly")} ·{" "}
              {formatNumber(repo.stars, locale)} {t(locale, "stars")}
            </li>
            <li>
              #{repo.rankByCategory ?? "-"} {repo.category}
            </li>
            <li>
              {quality.recentlyPushed
                ? t(locale, "recentlyPushed")
                : t(locale, `freshness${capitalize(freshness)}` as never)}
            </li>
          </ul>
        </section>

        <section className="drawer-section">
          <h3>{t(locale, "qualitySignals")}</h3>
          <div className="signal-grid">
            <span className={quality.hasLicense ? "signal on" : "signal"}>
              <CheckCircle2 size={14} />
              {t(locale, "hasLicense")}
            </span>
            <span className={quality.hasHomepage ? "signal on" : "signal"}>
              <CheckCircle2 size={14} />
              {t(locale, "hasHomepage")}
            </span>
            <span className={quality.recentlyPushed ? "signal on" : "signal"}>
              <CheckCircle2 size={14} />
              {t(locale, "recentlyPushed")}
            </span>
            <span className="signal">
              <CheckCircle2 size={14} />
              {t(locale, "openIssues")}: {quality.issueLoad}
            </span>
          </div>
        </section>

        <section className="drawer-section">
          <h3>{t(locale, "similarSkills")}</h3>
          {related.length ? (
            <div className="related-list">
              {related.map((relatedRepo) => (
                <button
                  type="button"
                  key={relatedRepo.repo}
                  onClick={() => onSelectRelated(relatedRepo)}
                >
                  <strong>{relatedRepo.repo}</strong>
                  <span>
                    {formatNumber(relatedRepo.stars, locale)}{" "}
                    {t(locale, "stars")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">{t(locale, "noSimilar")}</p>
          )}
        </section>

        <div className="tag-cloud">
          {[...repo.platforms, ...repo.tags].map((tag) => (
            <span className="badge" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </aside>
    </>
  );
}

function App() {
  const initialState = useMemo(() => getInitialState(), []);
  const [locale, setLocale] = useState<Locale>(initialState.locale);
  const [snapshot, setSnapshot] = useState<SnapshotPayload>(emptySnapshot);
  const [candidates, setCandidates] =
    useState<CandidatesPayload>(emptyCandidates);
  const [filters, setFilters] = useState<RepoFilters>(initialState.filters);
  const [selectedRepoId, setSelectedRepoId] = useState(
    initialState.selectedRepo,
  );
  const [refreshStatus, setRefreshStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [loadError, setLoadError] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [favorites, setFavorites] = useState<string[]>(() =>
    readFavoriteRepos(),
  );

  useEffect(() => {
    Promise.all([loadSnapshot(), loadCandidates()])
      .then(([snapshotPayload, candidatesPayload]) => {
        setSnapshot(snapshotPayload);
        setCandidates(candidatesPayload);
      })
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  useEffect(() => {
    function handlePopState() {
      const state = parseUrlState(window.location.search);
      setLocale(state.locale);
      setFilters(state.filters);
      setSelectedRepoId(state.selectedRepo);
      setRefreshStatus("idle");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const nextSearch = buildSearchParams(filters, locale, selectedRepoId);
    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, [filters, locale, selectedRepoId]);

  useEffect(() => {
    if (copyStatus === "idle") return;
    const timer = window.setTimeout(() => setCopyStatus("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const repositories = useMemo(
    () => enrichRepositories(snapshot.repositories),
    [snapshot.repositories],
  );
  const favoriteRepoSet = useMemo(
    () => new Set(favorites.map(normalizeRepoId)),
    [favorites],
  );
  const options = useMemo(() => getFilterOptions(repositories), [repositories]);
  const filteredRepos = useMemo(
    () =>
      filterAndSortRepositories(repositories, filters, locale, favoriteRepoSet),
    [repositories, filters, locale, favoriteRepoSet],
  );
  const topRepos = useMemo(
    () =>
      [...repositories]
        .sort((a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo))
        .slice(0, 3),
    [repositories],
  );
  const recommendedPicks = useMemo(
    () => getRecommendedPicks(repositories),
    [repositories],
  );
  const stats = useMemo(
    () => calculateStats(repositories, snapshot.generatedAt),
    [repositories, snapshot.generatedAt],
  );
  const snapshotStale = useMemo(
    () => isSnapshotOlderThan(snapshot.generatedAt, 24),
    [snapshot.generatedAt],
  );
  const candidatePreview = useMemo(
    () => topCandidates(candidates.candidates, 8),
    [candidates.candidates],
  );
  const selectedRepo = useMemo(
    () =>
      repositories.find(
        (repo) => repo.repo.toLowerCase() === selectedRepoId.toLowerCase(),
      ) ?? null,
    [repositories, selectedRepoId],
  );
  const activeFilters = useMemo(
    () =>
      [
        filters.audience
          ? audienceProfiles[filters.audience].label[locale]
          : "",
        filters.spotlight
          ? spotlightViews[filters.spotlight].label[locale]
          : "",
        filters.category,
        filters.platform,
        filters.tag,
        filters.license,
        filters.language,
        filters.query ? `"${filters.query}"` : "",
        filters.favoritesOnly ? t(locale, "favoritesOnly") : "",
      ].filter(Boolean),
    [filters, locale],
  );

  function updateFilters(
    next: RepoFilters | ((current: RepoFilters) => RepoFilters),
  ) {
    setFilters((current) =>
      typeof next === "function" ? next(current) : next,
    );
  }

  function setFilter<Key extends keyof RepoFilters>(
    key: Key,
    value: RepoFilters[Key],
  ) {
    updateFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleAudience(audience: AudienceKey) {
    updateFilters((current) => ({
      ...current,
      audience: current.audience === audience ? "" : audience,
      category: "",
      platform: "",
      tag: "",
    }));
  }

  function toggleSpotlight(spotlight: SpotlightKey) {
    updateFilters((current) => ({
      ...current,
      spotlight: current.spotlight === spotlight ? "" : spotlight,
    }));
  }

  function clearFilters() {
    setFilters(defaultRepoFilters);
  }

  function toggleFavorite(repo: SkillRepoSnapshot) {
    setFavorites((current) => {
      const next = toggleFavoriteRepo(current, repo.repo);
      return writeFavoriteRepos(next);
    });
  }

  function isFavorite(repo: SkillRepoSnapshot | null) {
    return Boolean(repo && favoriteRepoSet.has(repo.repo.toLowerCase()));
  }

  function openRepo(repo: SkillRepoSnapshot) {
    setSelectedRepoId(repo.repo);
    setRefreshStatus("idle");
  }

  function applyQuickFilter(key: QuickFilterKey) {
    const quickFilters: Record<QuickFilterKey, Partial<RepoFilters>> = {
      developerTools: {
        audience: "developer",
        spotlight: "developerStack",
        query: "",
      },
      creatorTools: {
        audience: "creator",
        spotlight: "creatorPicks",
        query: "",
      },
      mcpTools: {
        audience: "mcp",
        spotlight: "developerStack",
        query: "mcp",
      },
      researchRag: {
        audience: "research",
        spotlight: "",
        query: "rag",
      },
      beginnerFriendly: {
        audience: "",
        spotlight: "beginnerFriendly",
        query: "",
      },
      recentlyActive: {
        audience: "",
        spotlight: "recentlyActive",
        query: "",
      },
    };

    updateFilters((current) => ({
      ...current,
      ...quickFilters[key],
      category: "",
      platform: "",
      tag: "",
    }));
  }

  function startExploring() {
    const rankingPanel = document.getElementById("ranking-list");
    if (typeof rankingPanel?.scrollIntoView === "function") {
      rankingPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function viewWeeklyHot() {
    updateFilters((current) => ({ ...current, spotlight: "weeklyHot" }));
    startExploring();
  }

  function recommendSkill() {
    window.location.href = issueTemplateUrl;
  }

  async function copyShareLink(repoId = "") {
    const url = makeShareUrl(window.location.href, filters, locale, repoId);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copied) throw new Error("Clipboard fallback failed");
      }
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  async function refreshSelectedRepo() {
    if (!selectedRepo) return;
    setRefreshStatus("loading");
    try {
      const liveData = await fetchLiveRepository(selectedRepo.repo);
      const merged = { ...selectedRepo, ...liveData };
      setSnapshot((current) => ({
        ...current,
        repositories: current.repositories.map((repo) =>
          repo.repo === merged.repo ? merged : repo,
        ),
      }));
      setRefreshStatus("success");
    } catch {
      setRefreshStatus("error");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="eyebrow">{t(locale, "workbench")}</p>
            <h1>{t(locale, "appTitle")}</h1>
            <p>{t(locale, "appSubtitle")}</p>
          </div>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className={
              filters.favoritesOnly
                ? "secondary-button active-action"
                : "secondary-button"
            }
            aria-pressed={filters.favoritesOnly}
            onClick={() => setFilter("favoritesOnly", !filters.favoritesOnly)}
          >
            <BookmarkCheck size={16} />
            {t(locale, "myFavorites")} {favorites.length}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => copyShareLink()}
          >
            <Copy size={16} />
            {t(locale, "shareRanking")}
          </button>
          <a className="primary-button" href={issueTemplateUrl}>
            <ExternalLink size={16} />
            {t(locale, "contributeSkill")}
          </a>
          <button
            type="button"
            className="locale-button"
            onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
            title={
              locale === "zh" ? "Switch language to English" : "切换到中文"
            }
            aria-label={
              locale === "zh" ? "Switch language to English, EN" : "切换到中文"
            }
          >
            <Languages size={16} />
            {locale === "zh" ? "EN" : "中文"}
          </button>
        </div>
      </header>

      <HeroSection
        locale={locale}
        source={snapshot.source}
        generatedAt={stats.generatedAt}
        stale={snapshotStale}
        topRepos={topRepos}
        onStartExplore={startExploring}
        onWeeklyHot={viewWeeklyHot}
        onRecommendSkill={recommendSkill}
        onSelectRepo={openRepo}
      />

      {copyStatus !== "idle" ? (
        <p
          className={
            copyStatus === "copied" ? "notice success" : "notice error"
          }
          role="status"
        >
          {copyStatus === "copied"
            ? t(locale, "copied")
            : t(locale, "copyFailed")}
        </p>
      ) : null}

      <section className="metrics-row" aria-label="Dashboard metrics">
        <MetricCard
          label={t(locale, "curatedRepos")}
          value={formatNumber(stats.totalRepos, locale)}
          icon={<Code2 size={18} />}
        />
        <MetricCard
          label={t(locale, "totalStars")}
          value={formatNumber(stats.totalStars, locale)}
          icon={<Star size={18} />}
        />
        <MetricCard
          label={t(locale, "categories")}
          value={formatNumber(stats.totalCategories, locale)}
          icon={<Filter size={18} />}
        />
        <MetricCard
          label={t(locale, "activeRepos")}
          value={formatNumber(stats.activeCount, locale)}
          icon={<TrendingUp size={18} />}
        />
      </section>

      <FeaturedSkillCards
        picks={recommendedPicks}
        locale={locale}
        favoriteRepos={favoriteRepoSet}
        onSelect={openRepo}
        onToggleFavorite={toggleFavorite}
      />

      <QuickFilterChips
        locale={locale}
        filters={filters}
        onSelect={applyQuickFilter}
      />

      <section className="workspace-grid">
        <aside className="filter-panel">
          <div className="panel-title">
            <Filter size={16} />
            <strong>{t(locale, "globalRank")}</strong>
          </div>

          <label className="search-box">
            <Search size={16} />
            <input
              aria-label={t(locale, "searchPlaceholder")}
              value={filters.query}
              onChange={(event) => setFilter("query", event.target.value)}
              placeholder={t(locale, "searchPlaceholder")}
            />
          </label>

          <button
            type="button"
            className={
              filters.favoritesOnly
                ? "favorite-filter active"
                : "favorite-filter"
            }
            aria-pressed={filters.favoritesOnly}
            onClick={() => setFilter("favoritesOnly", !filters.favoritesOnly)}
          >
            <BookmarkCheck size={16} />
            <span>
              <strong>{t(locale, "favoritesOnly")}</strong>
              <small>
                {t(locale, "myFavorites")} {favorites.length}
              </small>
            </span>
          </button>

          <div className="audience-block">
            <div className="panel-title small">
              <UsersRound size={15} />
              <span>{t(locale, "audienceViews")}</span>
            </div>
            <div className="toggle-grid">
              {audienceKeys.map((audience) => {
                const profile = audienceProfiles[audience];
                const count = repositories.filter((repo) =>
                  inferAudiences(repo).includes(audience),
                ).length;
                return (
                  <ToggleCard
                    key={audience}
                    title={profile.label[locale]}
                    description={profile.description[locale]}
                    meta={formatNumber(count, locale)}
                    active={filters.audience === audience}
                    onClick={() => toggleAudience(audience)}
                  />
                );
              })}
            </div>
          </div>

          <div className="audience-block">
            <div className="panel-title small">
              <ArrowDownWideNarrow size={15} />
              <span>{t(locale, "spotlightViews")}</span>
            </div>
            <div className="toggle-grid single">
              {spotlightKeys.map((spotlight) => {
                const view = spotlightViews[spotlight];
                return (
                  <ToggleCard
                    key={spotlight}
                    title={view.label[locale]}
                    description={view.description[locale]}
                    active={filters.spotlight === spotlight}
                    onClick={() => toggleSpotlight(spotlight)}
                  />
                );
              })}
            </div>
          </div>

          <SelectField
            label={t(locale, "category")}
            allLabel={`${t(locale, "all")} ${t(locale, "category")}`}
            value={filters.category}
            options={options.categories}
            onChange={(value) => setFilter("category", value)}
          />
          <SelectField
            label={t(locale, "platform")}
            allLabel={`${t(locale, "all")} ${t(locale, "platform")}`}
            value={filters.platform}
            options={options.platforms}
            onChange={(value) => setFilter("platform", value)}
          />
          <SelectField
            label={t(locale, "tag")}
            allLabel={`${t(locale, "all")} ${t(locale, "tag")}`}
            value={filters.tag}
            options={options.tags}
            onChange={(value) => setFilter("tag", value)}
          />
          <SelectField
            label={t(locale, "license")}
            allLabel={`${t(locale, "all")} ${t(locale, "license")}`}
            value={filters.license}
            options={options.licenses}
            onChange={(value) => setFilter("license", value)}
          />
          <SelectField
            label={t(locale, "language")}
            allLabel={`${t(locale, "all")} ${t(locale, "language")}`}
            value={filters.language}
            options={options.languages}
            onChange={(value) => setFilter("language", value)}
          />

          <label className="field">
            <span>{t(locale, "sortBy")}</span>
            <select
              value={filters.sortKey}
              onChange={(event) =>
                setFilter("sortKey", event.target.value as SortKey)
              }
            >
              <option value="stars">{t(locale, "stars")}</option>
              <option value="forks">{t(locale, "forks")}</option>
              <option value="updated">{t(locale, "updated")}</option>
              <option value="name">{t(locale, "name")}</option>
            </select>
          </label>

          {activeFilters.length > 0 ? (
            <div
              className="active-filters"
              aria-label={t(locale, "selectedFilters")}
            >
              <span>{t(locale, "selectedFilters")}</span>
              <div className="badge-row">
                {activeFilters.map((filter) => (
                  <span className="badge" key={filter}>
                    {filter}
                  </span>
                ))}
              </div>
              <button
                className="secondary-button full-width"
                type="button"
                onClick={clearFilters}
              >
                <SlidersHorizontal size={16} />
                {t(locale, "clearFilters")}
              </button>
            </div>
          ) : null}
        </aside>

        <section className="ranking-panel" id="ranking-list">
          <div className="section-head">
            <div>
              <p>{t(locale, "globalRank")}</p>
              <h2>
                <ArrowDownWideNarrow size={20} />
                {filteredRepos.length} / {repositories.length}
              </h2>
              <span className="section-note">
                {t(locale, "rankingInsight")}
              </span>
            </div>
            <button
              type="button"
              className="source-pill"
              onClick={() => copyShareLink()}
            >
              <Copy size={14} />
              {t(locale, "shareRanking")}
            </button>
          </div>

          {loadError ? <p className="notice error">{loadError}</p> : null}
          {repositories.length === 0 ? (
            <p className="empty-state">{t(locale, "noData")}</p>
          ) : filteredRepos.length === 0 ? (
            <EmptyRankingState
              locale={locale}
              onClear={clearFilters}
              onSearch={(query) =>
                updateFilters((current) => ({
                  ...current,
                  query,
                  favoritesOnly: false,
                }))
              }
            />
          ) : (
            <RepositoryTable
              repositories={filteredRepos}
              locale={locale}
              favoriteRepos={favoriteRepoSet}
              onSelect={openRepo}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </section>

        <aside className="discovery-panel">
          <div className="section-head compact">
            <div>
              <p>{t(locale, "candidateNewStars")}</p>
              <h2>{candidatePreview.length}</h2>
            </div>
          </div>
          <p className="muted">{t(locale, "discoveryIntro")}</p>
          <CandidateList candidates={candidatePreview} locale={locale} />

          <div className="contribution-card">
            <strong>{t(locale, "contributeSkill")}</strong>
            <p>{t(locale, "contributionHint")}</p>
            <a className="secondary-button full-width" href={issueTemplateUrl}>
              <ExternalLink size={16} />
              {t(locale, "contributeSkill")}
            </a>
          </div>
        </aside>
      </section>

      <DetailDrawer
        repo={selectedRepo}
        repositories={repositories}
        locale={locale}
        status={refreshStatus}
        favorite={isFavorite(selectedRepo)}
        onRefresh={refreshSelectedRepo}
        onShare={copyShareLink}
        onToggleFavorite={toggleFavorite}
        onClose={() => {
          setSelectedRepoId("");
          setRefreshStatus("idle");
        }}
        onSelectRelated={openRepo}
      />
    </main>
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function getCandidateAudiences(candidate: CandidateRepo) {
  if (candidate.suggestedAudiences?.length) return candidate.suggestedAudiences;
  return audienceKeys.filter((audience) =>
    audienceProfiles[audience].categories.includes(
      candidate.suggestedCategory ?? candidate.category,
    ),
  );
}

function inferCandidateConfidence(candidate: CandidateRepo) {
  const starScore = Math.min(
    48,
    Math.round(Math.log10(candidate.stars + 1) * 18),
  );
  const freshnessScore = Date.parse(candidate.updatedAt || "") ? 14 : 0;
  const licenseScore =
    candidate.license && candidate.license !== "NOASSERTION" ? 12 : 0;
  return Math.max(
    42,
    Math.min(96, starScore + freshnessScore + licenseScore + 24),
  );
}

function getRecommendedPicks(
  repositories: SkillRepoSnapshot[],
): RecommendedPick[] {
  const sorted = [...repositories].sort(
    (a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo),
  );
  const used = new Set<string>();

  function take(
    key: RecommendedPick["key"],
    predicate: (repo: SkillRepoSnapshot) => boolean,
  ): RecommendedPick | null {
    const repo =
      sorted.find((item) => !used.has(item.repo) && predicate(item)) ??
      sorted.find((item) => !used.has(item.repo));
    if (!repo) return null;
    used.add(repo.repo);
    return { key, repo };
  }

  return [
    take("topOverall", () => true),
    take("developerPick", (repo) => matchesAudience(repo, "developer")),
    take("creatorPick", (repo) => matchesAudience(repo, "creator")),
    take("mcpPick", (repo) => matchesAudience(repo, "mcp")),
  ].filter((pick): pick is RecommendedPick => Boolean(pick));
}

function isSnapshotOlderThan(generatedAt: string, hours: number) {
  const timestamp = Date.parse(generatedAt || "");
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp > hours * 3_600_000;
}

function isQuickFilterActive(key: QuickFilterKey, filters: RepoFilters) {
  if (key === "developerTools") {
    return (
      filters.audience === "developer" && filters.spotlight === "developerStack"
    );
  }
  if (key === "creatorTools") {
    return (
      filters.audience === "creator" && filters.spotlight === "creatorPicks"
    );
  }
  if (key === "mcpTools") {
    return filters.audience === "mcp" && filters.query.toLowerCase() === "mcp";
  }
  if (key === "researchRag") {
    return (
      filters.audience === "research" && filters.query.toLowerCase() === "rag"
    );
  }
  if (key === "beginnerFriendly") {
    return filters.spotlight === "beginnerFriendly";
  }
  return filters.spotlight === "recentlyActive";
}

export default App;
