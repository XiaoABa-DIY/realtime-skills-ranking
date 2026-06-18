import {
  ArrowDownWideNarrow,
  Bookmark,
  BookmarkCheck,
  ChartNoAxesCombined,
  Clock3,
  Copy,
  ExternalLink,
  GitFork,
  Home,
  Languages,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  TerminalSquare,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "./App.css";
import { t } from "./i18n";
import { loadSnapshot } from "./lib/data";
import {
  normalizeSkillId,
  readFavoriteSkills,
  toggleFavoriteSkill,
  writeFavoriteSkills,
} from "./lib/favorites";
import { formatDateTime, formatNumber } from "./lib/format";
import {
  audienceKeys,
  audienceProfiles,
  calculateStats,
  defaultSkillFilters,
  deriveUseCases,
  enrichSkills,
  filterAndSortSkills,
  getFilterOptions,
  getRelatedSkills,
  matchesAudience,
  skillName,
  skillSummary,
  spotlightKeys,
  spotlightViews,
  type SkillFilters,
} from "./lib/ranking";
import {
  buildSearchParams,
  makeShareUrl,
  parseUrlState,
} from "./lib/url-state";
import type {
  AudienceKey,
  GithubSkillSnapshot,
  Locale,
  SkillCategory,
  SnapshotPayload,
  SortKey,
  SpotlightKey,
} from "./types";

const emptySnapshot: SnapshotPayload = {
  schemaVersion: 3,
  generatedAt: "",
  source: "empty",
  categories: [],
  skills: [],
};

const issueTemplateUrl =
  "https://github.com/XiaoABa-DIY/realtime-skills-ranking/issues/new?template=skill-recommendation.yml";

type QuickFilterKey =
  | "mediaTools"
  | "developerTools"
  | "writingTools"
  | "designTools"
  | "dataTools"
  | "productivityTools"
  | "beginnerTools";

const quickFilterKeys: QuickFilterKey[] = [
  "mediaTools",
  "developerTools",
  "writingTools",
  "designTools",
  "dataTools",
  "productivityTools",
  "beginnerTools",
];

function getInitialState() {
  if (typeof window === "undefined") {
    return {
      locale: "zh" as Locale,
      filters: defaultSkillFilters,
      selectedSkill: "",
    };
  }
  return parseUrlState(window.location.search);
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
      <span className="metric-icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
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

function SkillBadges({
  skill,
  locale,
  limit = 3,
}: {
  skill: GithubSkillSnapshot;
  locale: Locale;
  limit?: number;
}) {
  return (
    <div className="badge-row">
      {skill.featured ? (
        <span className="badge status status-2">{t(locale, "featured")}</span>
      ) : null}
      {skill.chineseScore >= 45 ? (
        <span className="badge status status-3">
          {t(locale, "chineseFriendly")}
        </span>
      ) : null}
      <span className="badge category">{skill.categoryName[locale]}</span>
      {skill.language ? <span className="badge">{skill.language}</span> : null}
      {skill.tags.slice(0, limit).map((tag) => (
        <span className="badge" key={tag}>
          {tag}
        </span>
      ))}
    </div>
  );
}

function formatSigned(value: number, locale: Locale) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value, locale)}`;
}

function formatRankDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  if (value > 0) return `↑${value}`;
  if (value < 0) return `↓${Math.abs(value)}`;
  return "0";
}

function TrendBadges({
  skill,
  locale,
}: {
  skill: GithubSkillSnapshot;
  locale: Locale;
}) {
  const badges = [
    skill.growth7d !== null && skill.growth7d !== undefined
      ? `${formatSigned(skill.growth7d, locale)} / 7d`
      : "",
    skill.growth30d !== null && skill.growth30d !== undefined
      ? `${formatSigned(skill.growth30d, locale)} / 30d`
      : "",
    skill.rankDelta7d !== null && skill.rankDelta7d !== undefined
      ? formatRankDelta(skill.rankDelta7d)
      : "",
  ].filter(Boolean);

  if (!badges.length) {
    return (
      <span className="trend-badge muted">{t(locale, "trendCollecting")}</span>
    );
  }

  return (
    <span className="trend-strip">
      {badges.map((badge) => (
        <span className="trend-badge" key={badge}>
          {badge}
        </span>
      ))}
    </span>
  );
}

function HeroSection({
  locale,
  snapshot,
  stale,
  topSkills,
  onStartExplore,
  onTopStars,
  onRecommendSkill,
  onSelectSkill,
}: {
  locale: Locale;
  snapshot: SnapshotPayload;
  stale: boolean;
  topSkills: GithubSkillSnapshot[];
  onStartExplore: () => void;
  onTopStars: () => void;
  onRecommendSkill: () => void;
  onSelectSkill: (skill: GithubSkillSnapshot) => void;
}) {
  return (
    <section className="hero-panel">
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
            <Sparkles size={16} />
            {t(locale, "startExploring")}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onTopStars}
          >
            <Star size={16} />
            {t(locale, "viewTopStars")}
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
          <Clock3 size={15} />
          <span>
            {stale ? t(locale, "dataMayBeStale") : t(locale, "lastRefresh")}:{" "}
            {snapshot.generatedAt
              ? formatDateTime(snapshot.generatedAt, locale)
              : "-"}
          </span>
          <b>{snapshot.source}</b>
        </div>
      </div>

      <div className="top-three-panel" aria-label={t(locale, "topThree")}>
        <div className="top-three-head">
          <ChartNoAxesCombined size={18} />
          <strong>{t(locale, "topThree")}</strong>
        </div>
        {topSkills.map((skill, index) => (
          <button
            type="button"
            className={`top-skill-card rank-${index + 1}`}
            key={skill.repo}
            onClick={() => onSelectSkill(skill)}
          >
            <span className="top-rank">#{index + 1}</span>
            <span>
              <strong>{skillName(skill, locale)}</strong>
              <small>{skill.repo}</small>
            </span>
            <em>{formatNumber(skill.stars, locale)}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

interface RecommendedPick {
  key: "topOverall" | "creatorPick" | "developerPick" | "dataPick";
  skill: GithubSkillSnapshot;
}

function FeaturedSkillCards({
  picks,
  locale,
  favoriteSkills,
  onSelect,
  onToggleFavorite,
}: {
  picks: RecommendedPick[];
  locale: Locale;
  favoriteSkills: ReadonlySet<string>;
  onSelect: (skill: GithubSkillSnapshot) => void;
  onToggleFavorite: (skill: GithubSkillSnapshot) => void;
}) {
  if (picks.length === 0) return null;

  return (
    <section className="featured-section" aria-labelledby="featured-title">
      <div className="section-head">
        <div>
          <p>{t(locale, "githubSource")}</p>
          <h2 id="featured-title">
            <Sparkles size={20} />
            {t(locale, "todayPicks")}
          </h2>
          <span>{t(locale, "todayPicksLead")}</span>
        </div>
      </div>
      <div className="featured-grid">
        {picks.map((pick) => (
          <article className="pick-card" key={pick.key}>
            <button
              type="button"
              className="pick-main"
              onClick={() => onSelect(pick.skill)}
            >
              <span className="pick-label">{t(locale, pick.key)}</span>
              <strong>{skillName(pick.skill, locale)}</strong>
              <small>{skillSummary(pick.skill, locale)}</small>
            </button>
            <SkillBadges skill={pick.skill} locale={locale} limit={2} />
            <div className="pick-stats">
              <span>
                <Star size={14} />
                {formatNumber(pick.skill.stars, locale)}
              </span>
              <span>
                <GitFork size={14} />
                {formatNumber(pick.skill.forks, locale)}
              </span>
              <span>{formatNumber(pick.skill.chineseScore, locale)}</span>
            </div>
            <div className="pick-actions">
              <button
                type="button"
                className="detail-link"
                onClick={() => onSelect(pick.skill)}
              >
                {t(locale, "viewDetails")}
              </button>
              <FavoriteButton
                compact
                active={favoriteSkills.has(pick.skill.repo.toLowerCase())}
                locale={locale}
                onClick={() => onToggleFavorite(pick.skill)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuickFilterChips({
  locale,
  filters,
  onSelect,
}: {
  locale: Locale;
  filters: SkillFilters;
  onSelect: (key: QuickFilterKey) => void;
}) {
  return (
    <section
      className="quick-filter-panel"
      aria-labelledby="quick-filter-title"
    >
      <div className="section-head compact">
        <div>
          <p>{t(locale, "audienceViews")}</p>
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

function CategoryChips({
  categories,
  locale,
  active,
  onSelect,
}: {
  categories: SkillCategory[];
  locale: Locale;
  active: string;
  onSelect: (category: string) => void;
}) {
  return (
    <div className="category-chip-row" aria-label={t(locale, "category")}>
      <button
        type="button"
        className={!active ? "category-chip active" : "category-chip"}
        onClick={() => onSelect("")}
      >
        {t(locale, "all")}
      </button>
      {categories.map((category) => (
        <button
          type="button"
          className={
            active === category.code ? "category-chip active" : "category-chip"
          }
          key={category.code}
          onClick={() => onSelect(category.code)}
        >
          {category.name[locale]}
        </button>
      ))}
    </div>
  );
}

function SkillCard({
  skill,
  locale,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  skill: GithubSkillSnapshot;
  locale: Locale;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <article className={skill.rank <= 3 ? "skill-card top-card" : "skill-card"}>
      <button type="button" className="skill-card-main" onClick={onSelect}>
        <span className="rank-pill">#{skill.rank}</span>
        <span className="skill-title-block">
          <strong>{skillName(skill, locale)}</strong>
          <small>{skill.repo}</small>
        </span>
      </button>
      <p>{skillSummary(skill, locale)}</p>
      <SkillBadges skill={skill} locale={locale} />
      <div className="skill-stats">
        <span>
          <Star size={14} />
          <b>{formatNumber(skill.stars, locale)}</b>
          {t(locale, "stars")}
        </span>
        <span>
          <GitFork size={14} />
          <b>{formatNumber(skill.forks, locale)}</b>
          {t(locale, "forks")}
        </span>
        <span>
          <TerminalSquare size={14} />
          <b>{formatNumber(skill.skillMdPaths.length, locale)}</b>
          {t(locale, "skillFiles")}
        </span>
      </div>
      <div className="trend-line">
        <TrendBadges skill={skill} locale={locale} />
      </div>
      <div className="skill-card-actions">
        <button type="button" className="detail-link" onClick={onSelect}>
          {t(locale, "viewDetails")}
        </button>
        <FavoriteButton
          active={favorite}
          locale={locale}
          compact
          onClick={onToggleFavorite}
        />
      </div>
    </article>
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
    <div className="empty-state">
      <strong>{t(locale, "noResultsTitle")}</strong>
      <p>{t(locale, "noResultsHint")}</p>
      <div className="empty-actions">
        <button type="button" className="secondary-button" onClick={onClear}>
          <SlidersHorizontal size={16} />
          {t(locale, "clearFilters")}
        </button>
        {["写作", "研究", "中文"].map((query) => (
          <button
            type="button"
            className="detail-link"
            key={query}
            onClick={() => onSearch(query)}
          >
            {query}
          </button>
        ))}
        <a className="detail-link" href={issueTemplateUrl}>
          {t(locale, "contributeSkill")}
        </a>
      </div>
    </div>
  );
}

function skillFileUrl(skill: GithubSkillSnapshot, skillPath: string) {
  return `${skill.htmlUrl}/blob/HEAD/${skillPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function DetailDrawer({
  skill,
  skills,
  locale,
  favorite,
  onShare,
  onToggleFavorite,
  onClose,
  onSelectRelated,
}: {
  skill: GithubSkillSnapshot | null;
  skills: GithubSkillSnapshot[];
  locale: Locale;
  favorite: boolean;
  onShare: (repo?: string) => void;
  onToggleFavorite: (skill: GithubSkillSnapshot) => void;
  onClose: () => void;
  onSelectRelated: (skill: GithubSkillSnapshot) => void;
}) {
  if (!skill) return null;
  const related = getRelatedSkills(skill, skills, 4);
  const readme =
    locale === "zh" ? skill.readmeSnippetZh : skill.readmeSnippetEn;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={skillName(skill, locale)}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">{t(locale, "detail")}</p>
            <h2>{skillName(skill, locale)}</h2>
            <span>{skill.repo}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={t(locale, "close")}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-actions">
          {skill.htmlUrl ? (
            <a
              className="primary-button"
              href={skill.htmlUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} />
              {t(locale, "openGithub")}
            </a>
          ) : (
            <button type="button" className="primary-button" disabled>
              <ExternalLink size={16} />
              {t(locale, "githubUnavailable")}
            </button>
          )}
          {skill.homepage ? (
            <a
              className="secondary-button"
              href={skill.homepage}
              target="_blank"
              rel="noreferrer"
            >
              <Home size={16} />
              {t(locale, "openHomepage")}
            </a>
          ) : (
            <button type="button" className="secondary-button" disabled>
              <Home size={16} />
              {t(locale, "homepageUnavailable")}
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => onShare(skill.repo)}
          >
            <Copy size={16} />
            {t(locale, "shareSkill")}
          </button>
          <FavoriteButton
            active={favorite}
            locale={locale}
            onClick={() => onToggleFavorite(skill)}
          />
        </div>

        <SkillBadges skill={skill} locale={locale} limit={8} />
        <p className="drawer-summary">{skillSummary(skill, locale)}</p>

        <div className="detail-metrics">
          <MetricCard
            label={t(locale, "globalRankLabel")}
            value={`#${skill.rank}`}
            icon={<ChartNoAxesCombined size={16} />}
          />
          <MetricCard
            label={t(locale, "stars")}
            value={formatNumber(skill.stars, locale)}
            icon={<Star size={16} />}
          />
          <MetricCard
            label={t(locale, "forks")}
            value={formatNumber(skill.forks, locale)}
            icon={<GitFork size={16} />}
          />
          <MetricCard
            label={t(locale, "chineseScore")}
            value={formatNumber(skill.chineseScore, locale)}
            icon={<TrendingUp size={16} />}
          />
        </div>

        <section className="drawer-section">
          <h3>{t(locale, "useCases")}</h3>
          <div className="use-case-list">
            {deriveUseCases(skill).map((useCase) => (
              <span key={useCase.zh}>{useCase[locale]}</span>
            ))}
          </div>
        </section>

        <section className="drawer-section">
          <h3>{t(locale, "skillPaths")}</h3>
          <div className="access-list">
            {skill.skillMdPaths.map((skillPath) => (
              <span key={skillPath}>
                <TerminalSquare size={14} />
                <a
                  href={skillFileUrl(skill, skillPath)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {skillPath}
                </a>
                <small>
                  {t(locale, "sourceRepo")}: {skill.repo}
                </small>
              </span>
            ))}
          </div>
        </section>

        <section className="drawer-section">
          <h3>{t(locale, "repositoryMetrics")}</h3>
          <div className="access-list">
            <span>
              <b>{t(locale, "language")}</b>
              <small>{skill.language || "-"}</small>
            </span>
            <span>
              <b>{t(locale, "license")}</b>
              <small>{skill.license || "-"}</small>
            </span>
            <span>
              <b>{t(locale, "issues")}</b>
              <small>{formatNumber(skill.openIssues, locale)}</small>
            </span>
            <span>
              <b>{t(locale, "updatedAt")}</b>
              <small>
                {formatDateTime(skill.pushedAt || skill.updatedAt, locale)}
              </small>
            </span>
          </div>
        </section>

        <section className="drawer-section">
          <h3>{t(locale, "similarSkills")}</h3>
          {related.length ? (
            <div className="related-list">
              {related.map((relatedSkill) => (
                <button
                  type="button"
                  key={relatedSkill.repo}
                  onClick={() => onSelectRelated(relatedSkill)}
                >
                  <strong>{skillName(relatedSkill, locale)}</strong>
                  <small>{skillSummary(relatedSkill, locale)}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">{t(locale, "noSimilar")}</p>
          )}
        </section>

        <section className="drawer-section">
          <h3>{t(locale, "readme")}</h3>
          {readme ? (
            <pre className="readme-block">{readme}</pre>
          ) : (
            <p className="muted">{t(locale, "noReadme")}</p>
          )}
        </section>
      </aside>
    </div>
  );
}

function App() {
  const [initialState] = useState(() => getInitialState());
  const [locale, setLocale] = useState<Locale>(initialState.locale);
  const [filters, setFilters] = useState<SkillFilters>(initialState.filters);
  const [selectedRepo, setSelectedRepo] = useState(initialState.selectedSkill);
  const [snapshot, setSnapshot] = useState<SnapshotPayload>(emptySnapshot);
  const [favorites, setFavorites] = useState<string[]>(() =>
    readFavoriteSkills(),
  );
  const [loadError, setLoadError] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  useEffect(() => {
    let cancelled = false;

    loadSnapshot()
      .then((payload) => {
        if (!cancelled) setSnapshot(payload);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const skills = useMemo(() => enrichSkills(snapshot.skills ?? []), [snapshot]);
  const favoriteSkillSet = useMemo(
    () => new Set(favorites.map((skill) => normalizeSkillId(skill))),
    [favorites],
  );
  const filteredSkills = useMemo(
    () => filterAndSortSkills(skills, filters, locale, favoriteSkillSet),
    [skills, filters, locale, favoriteSkillSet],
  );
  const stats = useMemo(
    () => calculateStats(skills, snapshot.generatedAt),
    [skills, snapshot.generatedAt],
  );
  const options = useMemo(() => getFilterOptions(skills), [skills]);
  const topSkills = useMemo(
    () => [...skills].sort((a, b) => b.stars - a.stars).slice(0, 3),
    [skills],
  );
  const recommendedPicks = useMemo(() => getRecommendedPicks(skills), [skills]);
  const selectedSkill = useMemo(
    () =>
      skills.find(
        (skill) => skill.repo.toLowerCase() === selectedRepo.toLowerCase(),
      ) ?? null,
    [skills, selectedRepo],
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
        filters.category
          ? categoryName(snapshot.categories, filters.category, locale)
          : "",
        filters.tag,
        filters.query ? `"${filters.query}"` : "",
        filters.favoritesOnly ? t(locale, "favoritesOnly") : "",
      ].filter(Boolean),
    [filters, locale, snapshot.categories],
  );
  const snapshotStale = isSnapshotOlderThan(snapshot.generatedAt, 24);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextSearch = buildSearchParams(filters, locale, selectedRepo);
    if (window.location.search !== nextSearch) {
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${nextSearch}`,
      );
    }
  }, [filters, locale, selectedRepo]);

  function updateFilters(
    next: SkillFilters | ((current: SkillFilters) => SkillFilters),
  ) {
    setFilters((current) =>
      typeof next === "function" ? next(current) : next,
    );
  }

  function setFilter<Key extends keyof SkillFilters>(
    key: Key,
    value: SkillFilters[Key],
  ) {
    updateFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(defaultSkillFilters);
  }

  function toggleAudience(audience: AudienceKey) {
    updateFilters((current) => ({
      ...current,
      audience: current.audience === audience ? "" : audience,
      category: "",
      tag: "",
    }));
  }

  function toggleSpotlight(spotlight: SpotlightKey) {
    updateFilters((current) => ({
      ...current,
      spotlight: current.spotlight === spotlight ? "" : spotlight,
    }));
  }

  function toggleFavorite(skill: GithubSkillSnapshot) {
    setFavorites((current) => {
      const next = toggleFavoriteSkill(current, skill.repo);
      return writeFavoriteSkills(next);
    });
  }

  function openSkill(skill: GithubSkillSnapshot) {
    setSelectedRepo(skill.repo);
  }

  function applyQuickFilter(key: QuickFilterKey) {
    const quickFilters: Record<QuickFilterKey, Partial<SkillFilters>> = {
      mediaTools: { audience: "media", query: "" },
      developerTools: { audience: "developer", query: "" },
      writingTools: { audience: "writing", query: "prompt" },
      designTools: { audience: "design", query: "" },
      dataTools: { audience: "data", query: "" },
      productivityTools: { audience: "productivity", query: "" },
      beginnerTools: { audience: "beginner", spotlight: "chineseFriendly" },
    };

    updateFilters((current) => ({
      ...current,
      ...quickFilters[key],
      tag: "",
    }));
  }

  function startExploring() {
    const gallery = document.getElementById("skills-gallery");
    if (typeof gallery?.scrollIntoView === "function") {
      gallery.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function viewTopStars() {
    updateFilters((current) => ({ ...current, spotlight: "topStars" }));
    startExploring();
  }

  function recommendSkill() {
    window.location.href = issueTemplateUrl;
  }

  async function copyShareLink(repo = "") {
    const url = makeShareUrl(window.location.href, filters, locale, repo);
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
              locale === "zh" ? "Switch language to English" : "切换到中文"
            }
          >
            <Languages size={16} />
            {locale === "zh" ? "EN" : "中文"}
          </button>
        </div>
      </header>

      <HeroSection
        locale={locale}
        snapshot={snapshot}
        stale={snapshotStale}
        topSkills={topSkills}
        onStartExplore={startExploring}
        onTopStars={viewTopStars}
        onRecommendSkill={recommendSkill}
        onSelectSkill={openSkill}
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

      <section className="metrics-row" aria-label="GitHub metrics">
        <MetricCard
          label={t(locale, "metricsSkills")}
          value={formatNumber(stats.totalSkills, locale)}
          icon={<Layers3 size={18} />}
        />
        <MetricCard
          label={t(locale, "metricsStars")}
          value={formatNumber(stats.totalStars, locale)}
          icon={<Star size={18} />}
        />
        <MetricCard
          label={t(locale, "metricsForks")}
          value={formatNumber(stats.totalForks, locale)}
          icon={<GitFork size={18} />}
        />
        <MetricCard
          label={t(locale, "metricsChinese")}
          value={formatNumber(stats.chineseFriendly, locale)}
          icon={<TrendingUp size={18} />}
        />
      </section>

      <FeaturedSkillCards
        picks={recommendedPicks}
        locale={locale}
        favoriteSkills={favoriteSkillSet}
        onSelect={openSkill}
        onToggleFavorite={toggleFavorite}
      />

      <QuickFilterChips
        locale={locale}
        filters={filters}
        onSelect={applyQuickFilter}
      />

      <section className="gallery-layout" id="skills-gallery">
        <aside className="filter-panel">
          <div className="panel-title">
            <Search size={16} />
            <strong>{t(locale, "searchPlaceholder")}</strong>
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

          <div className="filter-group">
            <div className="panel-title small">
              <UsersRound size={15} />
              <span>{t(locale, "audienceViews")}</span>
            </div>
            <div className="toggle-grid">
              {audienceKeys.map((audience) => {
                const profile = audienceProfiles[audience];
                const count = skills.filter((skill) =>
                  matchesAudience(skill, audience),
                ).length;
                return (
                  <button
                    type="button"
                    key={audience}
                    className={
                      filters.audience === audience
                        ? "toggle-card active"
                        : "toggle-card"
                    }
                    aria-pressed={filters.audience === audience}
                    onClick={() => toggleAudience(audience)}
                  >
                    <strong>{profile.label[locale]}</strong>
                    <small>{formatNumber(count, locale)}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="filter-group">
            <div className="panel-title small">
              <ArrowDownWideNarrow size={15} />
              <span>{t(locale, "spotlightViews")}</span>
            </div>
            <div className="toggle-grid">
              {spotlightKeys.map((spotlight) => (
                <button
                  type="button"
                  key={spotlight}
                  className={
                    filters.spotlight === spotlight
                      ? "toggle-card active"
                      : "toggle-card"
                  }
                  aria-pressed={filters.spotlight === spotlight}
                  onClick={() => toggleSpotlight(spotlight)}
                >
                  <strong>{spotlightViews[spotlight].label[locale]}</strong>
                  <small>{spotlightViews[spotlight].description[locale]}</small>
                </button>
              ))}
            </div>
          </div>

          <label className="field">
            <span>{t(locale, "tag")}</span>
            <select
              value={filters.tag}
              onChange={(event) => setFilter("tag", event.target.value)}
            >
              <option value="">{`${t(locale, "all")} ${t(locale, "tag")}`}</option>
              {options.tags.map((tagValue) => (
                <option key={tagValue} value={tagValue}>
                  {tagValue}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t(locale, "sortBy")}</span>
            <select
              value={filters.sortKey}
              onChange={(event) =>
                setFilter("sortKey", event.target.value as SortKey)
              }
            >
              <option value="stars">{t(locale, "sortStars")}</option>
              <option value="forks">{t(locale, "sortForks")}</option>
              <option value="updated">{t(locale, "sortUpdated")}</option>
              <option value="name">{t(locale, "sortName")}</option>
            </select>
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

          {activeFilters.length ? (
            <div className="active-filters">
              <span>{t(locale, "selectedFilters")}</span>
              <div className="badge-row">
                {activeFilters.map((filter) => (
                  <span className="badge" key={filter}>
                    {filter}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="secondary-button full-width"
                onClick={clearFilters}
              >
                <SlidersHorizontal size={16} />
                {t(locale, "clearFilters")}
              </button>
            </div>
          ) : null}
        </aside>

        <section className="skills-panel">
          <div className="section-head">
            <div>
              <p>{t(locale, "rankingInsight")}</p>
              <h2>
                <Tag size={20} />
                {filteredSkills.length} / {skills.length}
              </h2>
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

          <CategoryChips
            categories={snapshot.categories}
            locale={locale}
            active={filters.category}
            onSelect={(category) => setFilter("category", category)}
          />

          {loadError ? <p className="notice error">{loadError}</p> : null}
          {skills.length === 0 ? (
            <p className="empty-state">{t(locale, "noData")}</p>
          ) : filteredSkills.length === 0 ? (
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
            <div className="skills-grid">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.repo}
                  skill={skill}
                  locale={locale}
                  favorite={favoriteSkillSet.has(skill.repo.toLowerCase())}
                  onSelect={() => openSkill(skill)}
                  onToggleFavorite={() => toggleFavorite(skill)}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      <DetailDrawer
        skill={selectedSkill}
        skills={skills}
        locale={locale}
        favorite={Boolean(
          selectedSkill &&
          favoriteSkillSet.has(selectedSkill.repo.toLowerCase()),
        )}
        onShare={copyShareLink}
        onToggleFavorite={toggleFavorite}
        onClose={() => setSelectedRepo("")}
        onSelectRelated={openSkill}
      />
    </main>
  );
}

function categoryName(
  categories: SkillCategory[],
  code: string,
  locale: Locale,
) {
  return (
    categories.find((category) => category.code === code)?.name[locale] ?? code
  );
}

function getRecommendedPicks(skills: GithubSkillSnapshot[]): RecommendedPick[] {
  const sorted = [...skills].sort(
    (a, b) => b.stars - a.stars || b.chineseScore - a.chineseScore,
  );
  const used = new Set<string>();

  function take(
    key: RecommendedPick["key"],
    predicate: (skill: GithubSkillSnapshot) => boolean,
  ): RecommendedPick | null {
    const skill =
      sorted.find((item) => !used.has(item.repo) && predicate(item)) ??
      sorted.find((item) => !used.has(item.repo));
    if (!skill) return null;
    used.add(skill.repo);
    return { key, skill };
  }

  return [
    take("topOverall", () => true),
    take("creatorPick", (skill) => matchesAudience(skill, "media")),
    take("developerPick", (skill) => matchesAudience(skill, "developer")),
    take("dataPick", (skill) => matchesAudience(skill, "data")),
  ].filter((pick): pick is RecommendedPick => Boolean(pick));
}

function isSnapshotOlderThan(generatedAt: string, hours: number) {
  const timestamp = Date.parse(generatedAt || "");
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp > hours * 3_600_000;
}

function isQuickFilterActive(key: QuickFilterKey, filters: SkillFilters) {
  if (key === "mediaTools") return filters.audience === "media";
  if (key === "developerTools") return filters.audience === "developer";
  if (key === "writingTools") return filters.audience === "writing";
  if (key === "designTools") return filters.audience === "design";
  if (key === "dataTools") return filters.audience === "data";
  if (key === "productivityTools") return filters.audience === "productivity";
  return (
    filters.audience === "beginner" && filters.spotlight === "chineseFriendly"
  );
}

export default App;
