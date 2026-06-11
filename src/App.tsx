import {
  ArrowDownWideNarrow,
  Code2,
  ExternalLink,
  Filter,
  Globe2,
  Languages,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "./App.css";
import { loadCandidates, loadSnapshot, fetchLiveRepository } from "./lib/data";
import { formatDate, formatDateTime, formatNumber } from "./lib/format";
import {
  calculateStats,
  filterAndSortRepositories,
  getFilterOptions,
  topCandidates,
  type RepoFilters,
} from "./lib/ranking";
import { t } from "./i18n";
import type {
  CandidateRepo,
  CandidatesPayload,
  Locale,
  SkillRepoSnapshot,
  SnapshotPayload,
  SortKey,
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

const initialFilters: RepoFilters = {
  query: "",
  category: "",
  platform: "",
  tag: "",
  license: "",
  language: "",
  sortKey: "stars",
};

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

function AudienceShortcut({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "audience-chip active" : "audience-chip"}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
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

function RepoBadges({
  repo,
  locale,
}: {
  repo: SkillRepoSnapshot;
  locale: Locale;
}) {
  return (
    <div className="badge-row">
      {repo.featured ? (
        <span className="badge accent">{t(locale, "featured")}</span>
      ) : null}
      {repo.archived ? (
        <span className="badge warning">{t(locale, "archived")}</span>
      ) : null}
      {repo.fetchStatus === "error" ? (
        <span className="badge danger">{t(locale, "error")}</span>
      ) : null}
      {repo.tags.slice(0, 3).map((tag) => (
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
  onSelect,
}: {
  repositories: SkillRepoSnapshot[];
  locale: Locale;
  onSelect: (repo: SkillRepoSnapshot) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>{t(locale, "repository")}</th>
            <th>{t(locale, "category")}</th>
            <th>{t(locale, "stars")}</th>
            <th>{t(locale, "forks")}</th>
            <th>{t(locale, "updatedAt")}</th>
            <th>{t(locale, "viewDetails")}</th>
          </tr>
        </thead>
        <tbody>
          {repositories.map((repo, index) => (
            <tr key={repo.repo} onClick={() => onSelect(repo)}>
              <td className="rank-cell" data-label="#">
                {index + 1}
              </td>
              <td className="repo-data" data-label={t(locale, "repository")}>
                <div className="repo-cell">
                  <strong>{repo.repo}</strong>
                  <span>{repo.summary[locale]}</span>
                  <RepoBadges repo={repo} locale={locale} />
                </div>
              </td>
              <td data-label={t(locale, "category")}>{repo.category}</td>
              <td className="number-cell" data-label={t(locale, "stars")}>
                {formatNumber(repo.stars, locale)}
              </td>
              <td className="number-cell" data-label={t(locale, "forks")}>
                {formatNumber(repo.forks, locale)}
              </td>
              <td data-label={t(locale, "updatedAt")}>
                {formatDate(repo.updatedAt, locale)}
              </td>
              <td data-label={t(locale, "viewDetails")}>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
      {candidates.map((candidate) => (
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
              {candidate.category} · {t(locale, "matchedBy")}:{" "}
              {candidate.matchedQuery}
            </small>
          </span>
          <span className="candidate-stars">
            <Star size={14} />
            {formatNumber(candidate.stars, locale)}
          </span>
        </a>
      ))}
    </div>
  );
}

function DetailDrawer({
  repo,
  locale,
  status,
  onRefresh,
  onClose,
}: {
  repo: SkillRepoSnapshot | null;
  locale: Locale;
  status: "idle" | "loading" | "success" | "error";
  onRefresh: () => void;
  onClose: () => void;
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
          <button
            type="button"
            className="primary-button"
            onClick={onRefresh}
            disabled={status === "loading"}
          >
            <RefreshCcw size={16} />
            {status === "loading"
              ? t(locale, "refreshing")
              : t(locale, "realtimeRefresh")}
          </button>
          <a
            className="secondary-button"
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
            <dt>{t(locale, "stars")}</dt>
            <dd>{formatNumber(repo.stars, locale)}</dd>
          </div>
          <div>
            <dt>{t(locale, "forks")}</dt>
            <dd>{formatNumber(repo.forks, locale)}</dd>
          </div>
          <div>
            <dt>{t(locale, "issues")}</dt>
            <dd>{formatNumber(repo.openIssues, locale)}</dd>
          </div>
          <div>
            <dt>{t(locale, "language")}</dt>
            <dd>{repo.language}</dd>
          </div>
          <div>
            <dt>{t(locale, "license")}</dt>
            <dd>{repo.license}</dd>
          </div>
          <div>
            <dt>{t(locale, "updatedAt")}</dt>
            <dd>{formatDateTime(repo.updatedAt, locale)}</dd>
          </div>
        </dl>

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
  const [locale, setLocale] = useState<Locale>("zh");
  const [snapshot, setSnapshot] = useState<SnapshotPayload>(emptySnapshot);
  const [candidates, setCandidates] =
    useState<CandidatesPayload>(emptyCandidates);
  const [filters, setFilters] = useState<RepoFilters>(initialFilters);
  const [selectedRepo, setSelectedRepo] = useState<SkillRepoSnapshot | null>(
    null,
  );
  const [refreshStatus, setRefreshStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    Promise.all([loadSnapshot(), loadCandidates()])
      .then(([snapshotPayload, candidatesPayload]) => {
        setSnapshot(snapshotPayload);
        setCandidates(candidatesPayload);
      })
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  const options = useMemo(
    () => getFilterOptions(snapshot.repositories),
    [snapshot.repositories],
  );
  const filteredRepos = useMemo(
    () => filterAndSortRepositories(snapshot.repositories, filters, locale),
    [snapshot.repositories, filters, locale],
  );
  const stats = useMemo(
    () => calculateStats(snapshot.repositories, snapshot.generatedAt),
    [snapshot.repositories, snapshot.generatedAt],
  );
  const candidatePreview = useMemo(
    () => topCandidates(candidates.candidates, 8),
    [candidates.candidates],
  );
  const activeFilters = useMemo(
    () =>
      [
        filters.category,
        filters.platform,
        filters.tag,
        filters.license,
        filters.language,
        filters.query ? `"${filters.query}"` : "",
      ].filter(Boolean),
    [filters],
  );

  function setFilter<Key extends keyof RepoFilters>(
    key: Key,
    value: RepoFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(initialFilters);
  }

  async function refreshSelectedRepo() {
    if (!selectedRepo) return;
    setRefreshStatus("loading");
    try {
      const liveData = await fetchLiveRepository(selectedRepo.repo);
      const merged = { ...selectedRepo, ...liveData };
      setSelectedRepo(merged);
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
            <h1>{t(locale, "appTitle")}</h1>
            <p>{t(locale, "appSubtitle")}</p>
          </div>
        </div>
        <button
          type="button"
          className="locale-button"
          onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
          title={locale === "zh" ? "Switch language to English" : "切换到中文"}
          aria-label={
            locale === "zh" ? "Switch language to English, EN" : "切换到中文"
          }
        >
          <Languages size={16} />
          {locale === "zh" ? "EN" : "中文"}
        </button>
      </header>

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
          label={t(locale, "lastRefresh")}
          value={formatDateTime(stats.generatedAt, locale)}
          icon={<RefreshCcw size={18} />}
        />
      </section>

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

          <div className="audience-block">
            <div className="panel-title small">
              <UsersRound size={15} />
              <span>{t(locale, "audienceViews")}</span>
            </div>
            <div className="audience-grid">
              <AudienceShortcut
                label={t(locale, "audienceDeveloper")}
                active={filters.category === "Developer Tools"}
                onClick={() => setFilter("category", "Developer Tools")}
              />
              <AudienceShortcut
                label={t(locale, "audienceCreator")}
                active={filters.category === "Creator & Content"}
                onClick={() => setFilter("category", "Creator & Content")}
              />
              <AudienceShortcut
                label={t(locale, "audienceResearch")}
                active={filters.category === "Data & Research"}
                onClick={() => setFilter("category", "Data & Research")}
              />
              <AudienceShortcut
                label={t(locale, "audienceWorkflow")}
                active={filters.category === "Productivity"}
                onClick={() => setFilter("category", "Productivity")}
              />
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

        <section className="ranking-panel">
          <div className="section-head">
            <div>
              <p>{t(locale, "globalRank")}</p>
              <h2>
                <ArrowDownWideNarrow size={20} />
                {filteredRepos.length} / {snapshot.repositories.length}
              </h2>
              <span className="section-note">
                {t(locale, "rankingInsight")}
              </span>
            </div>
            <span className="source-pill">
              <Globe2 size={14} />
              {snapshot.source}
            </span>
          </div>

          {loadError ? <p className="notice error">{loadError}</p> : null}
          {snapshot.repositories.length === 0 ? (
            <p className="empty-state">{t(locale, "noData")}</p>
          ) : filteredRepos.length === 0 ? (
            <p className="empty-state">{t(locale, "noResults")}</p>
          ) : (
            <RepositoryTable
              repositories={filteredRepos}
              locale={locale}
              onSelect={(repo) => {
                setSelectedRepo(repo);
                setRefreshStatus("idle");
              }}
            />
          )}
        </section>

        <aside className="discovery-panel">
          <div className="section-head compact">
            <div>
              <p>{t(locale, "candidates")}</p>
              <h2>{candidatePreview.length}</h2>
            </div>
          </div>
          <p className="muted">{t(locale, "discoveryIntro")}</p>
          <CandidateList candidates={candidatePreview} locale={locale} />
        </aside>
      </section>

      <DetailDrawer
        repo={selectedRepo}
        locale={locale}
        status={refreshStatus}
        onRefresh={refreshSelectedRepo}
        onClose={() => setSelectedRepo(null)}
      />
    </main>
  );
}

export default App;
