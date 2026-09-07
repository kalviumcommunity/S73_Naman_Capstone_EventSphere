import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api, { errorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import EventGrid, { EventGridSkeleton } from "../components/events/EventGrid";
import { Button, Select, Alert, EmptyState, Switch } from "../components/ui";
import { IconSearch, IconPin, IconSparkle, IconRefresh, IconArrowRight } from "../components/ui/Icons";
import { useBookmarkToggle, patchEvents } from "../lib/useBookmarks";

const CATEGORIES = ["All", "Music", "Sports", "Tech", "Art", "Food", "Business", "Other"];
const PAGE_SIZE = 12;

/** Query-string state, so a filtered view is shareable and survives a reload. */
function readParams(params) {
  return {
    keyword: params.get("q") || "",
    location: params.get("where") || "",
    category: params.get("category") || "All",
    city: params.get("city") || "",
    sort: params.get("sort") || "date",
    dateFrom: params.get("from") || "",
    dateTo: params.get("to") || "",
    free: params.get("free") === "true",
    online: params.get("online") || "",
    forYou: params.get("forYou") === "true",
    page: Number(params.get("page")) || 1,
  };
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readParams(searchParams), [searchParams]);
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [cities, setCities] = useState([]);

  // Local mirrors so typing feels instant while the URL updates on a debounce.
  const [keywordDraft, setKeywordDraft] = useState(filters.keyword);
  const [locationDraft, setLocationDraft] = useState(filters.location);
  const resultsRef = useRef(null);
  const isFirstRender = useRef(true);

  const toggleBookmark = useBookmarkToggle(patchEvents(setEvents));

  /** Merge patches into the query string, resetting to page 1 unless paging. */
  const updateParams = useCallback(
    (patch) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(patch).forEach(([key, value]) => {
            if (value === "" || value === false || value == null || value === "All" || value === "date") {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          });
          if (!("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Debounce the free-text inputs into the URL.
  useEffect(() => {
    if (keywordDraft === filters.keyword) return undefined;
    const timer = setTimeout(() => updateParams({ q: keywordDraft }), 380);
    return () => clearTimeout(timer);
  }, [keywordDraft, filters.keyword, updateParams]);

  useEffect(() => {
    if (locationDraft === filters.location) return undefined;
    const timer = setTimeout(() => updateParams({ where: locationDraft }), 380);
    return () => clearTimeout(timer);
  }, [locationDraft, filters.location, updateParams]);

  // Fetch whenever the query string changes.
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      const query = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(filters.page) });
      if (filters.keyword) query.set("keyword", filters.keyword);
      if (filters.location) query.set("location", filters.location);
      if (filters.category !== "All") query.set("category", filters.category);
      if (filters.city) query.set("city", filters.city);
      if (filters.sort !== "date") query.set("sort", filters.sort);
      if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) query.set("dateTo", filters.dateTo);
      if (filters.free) query.set("free", "true");
      if (filters.online) query.set("online", filters.online);
      if (filters.forYou && user) query.set("forYou", "true");

      try {
        const { data } = await api.get(`/api/events?${query}`, { signal: controller.signal });
        setEvents(data.events);
        setMeta({ total: data.total, pages: data.pages, hasMore: data.hasMore });
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setError(errorMessage(err, "Could not load events."));
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [filters, user]);

  // Scroll the results into view when paging, but never on first paint.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (filters.page > 1) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filters.page]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get("/api/stats"), api.get("/api/cities")])
      .then(([statsRes, citiesRes]) => {
        if (cancelled) return;
        setStats(statsRes.data);
        setCities(citiesRes.data.cities);
      })
      .catch(() => {
        // The hero copy degrades gracefully without these.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    const map = new Map((stats?.categories || []).map((c) => [c.category, c.count]));
    return map;
  }, [stats]);

  const hasFilters =
    Boolean(filters.keyword || filters.location || filters.city || filters.dateFrom ||
      filters.dateTo || filters.free || filters.online || filters.forYou) ||
    filters.category !== "All";

  const clearAll = () => {
    setKeywordDraft("");
    setLocationDraft("");
    setSearchParams({}, { replace: true });
  };

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <p className="eyebrow">
            <span className="live-dot" aria-hidden="true" />
            Refreshed daily from live sources
          </p>

          <h1 className="hero__title">
            Find out what&rsquo;s <em>actually on</em> near you.
          </h1>

          <p className="hero__sub">
            Concerts, conferences, park runs and food markets — pulled from real event
            providers every day, not a static list. Search it, save it, show up.
          </p>

          <form className="searchbar" onSubmit={(e) => e.preventDefault()} role="search">
            <div className="searchbar__group">
              <IconSearch className="searchbar__icon" />
              <input
                className="searchbar__input"
                type="search"
                placeholder="Search events, topics or artists"
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                aria-label="Search events"
              />
            </div>
            <div className="searchbar__group">
              <IconPin className="searchbar__icon" />
              <input
                className="searchbar__input"
                type="search"
                placeholder="Anywhere"
                value={locationDraft}
                onChange={(e) => setLocationDraft(e.target.value)}
                aria-label="Filter by place"
              />
            </div>
          </form>

          {stats && (
            <div className="hero__stats">
              <span className="hero__stat"><b>{stats.upcoming.toLocaleString()}</b> upcoming events</span>
              <span className="hero__stat"><b>{stats.cities.toLocaleString()}</b> cities</span>
              <span className="hero__stat"><b>7</b> categories</span>
            </div>
          )}
        </div>
      </section>

      <section className="filters">
        <div className="container">
          <div className="filters__row">
            {CATEGORIES.map((cat) => {
              const count = categoryCounts.get(cat);
              return (
                <button
                  key={cat}
                  className="chip"
                  aria-pressed={filters.category === cat}
                  onClick={() => updateParams({ category: cat })}
                >
                  {cat}
                  {cat !== "All" && count ? <span className="chip__count">{count}</span> : null}
                </button>
              );
            })}
          </div>

          <div className="filters__row">
            <Select
              className="filter-select"
              value={filters.city}
              onChange={(e) => updateParams({ city: e.target.value })}
              aria-label="Filter by city"
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>{c.city} ({c.count})</option>
              ))}
            </Select>

            <Select
              className="filter-select"
              value={filters.sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              aria-label="Sort events"
            >
              <option value="date">Soonest first</option>
              <option value="newest">Recently added</option>
              <option value="priceAsc">Lowest price</option>
            </Select>

            <Select
              className="filter-select"
              value={filters.online}
              onChange={(e) => updateParams({ online: e.target.value })}
              aria-label="Filter by format"
            >
              <option value="">Any format</option>
              <option value="false">In person</option>
              <option value="true">Online</option>
            </Select>

            <input
              type="date"
              className="input filter-date"
              value={filters.dateFrom}
              onChange={(e) => updateParams({ from: e.target.value })}
              aria-label="Events from this date"
            />
            <input
              type="date"
              className="input filter-date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => updateParams({ to: e.target.value })}
              aria-label="Events up to this date"
            />

            <button
              className="chip"
              aria-pressed={filters.free}
              onClick={() => updateParams({ free: !filters.free })}
            >
              Free only
            </button>

            {user && user.interests?.length > 0 && (
              <button
                className="chip"
                aria-pressed={filters.forYou}
                onClick={() => updateParams({ forYou: !filters.forYou })}
                title={`Matches your interests: ${user.interests.join(", ")}`}
              >
                <IconSparkle style={{ width: 14, height: 14 }} /> For you
              </button>
            )}

            <span className="filters__spacer" />

            {hasFilters && (
              <Button variant="ghost" size="sm" icon={IconRefresh} onClick={clearAll}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="container" ref={resultsRef}>
        <div className="results-bar">
          <h2 className="section-head__title">
            {filters.forYou
              ? "Picked for you"
              : filters.category === "All"
                ? "Upcoming events"
                : `${filters.category} events`}
          </h2>
          {!loading && (
            <p className="results-bar__count">
              {meta.total.toLocaleString()} {meta.total === 1 ? "event" : "events"}
              {filters.keyword && ` matching “${filters.keyword}”`}
              {meta.pages > 1 && ` · page ${filters.page} of ${meta.pages}`}
            </p>
          )}
        </div>

        {error && <Alert>{error}</Alert>}

        {loading ? (
          <EventGridSkeleton count={PAGE_SIZE} />
        ) : events.length === 0 ? (
          <EmptyState
            title="No events match those filters"
            action={hasFilters ? <Button variant="secondary" onClick={clearAll}>Clear filters</Button> : null}
          >
            {hasFilters
              ? "Try widening the date range, choosing another city, or clearing a filter."
              : "The catalogue is refreshing. Check back in a moment."}
          </EmptyState>
        ) : (
          <>
            <EventGrid events={events} onToggleBookmark={toggleBookmark} />

            {meta.pages > 1 && (
              <nav className="pagination" aria-label="Pagination">
                <Button
                  variant="secondary"
                  disabled={filters.page <= 1}
                  onClick={() => updateParams({ page: filters.page - 1 })}
                >
                  Previous
                </Button>
                <span className="pagination__status">
                  Page {filters.page} of {meta.pages}
                </span>
                <Button
                  variant="secondary"
                  iconAfter={IconArrowRight}
                  disabled={!meta.hasMore}
                  onClick={() => updateParams({ page: filters.page + 1 })}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        )}

        {!user && !loading && events.length > 0 && (
          <div className="card card--pad" style={{ marginTop: "var(--space-7)", textAlign: "center" }}>
            <h3 style={{ fontSize: "var(--text-lg)", marginBottom: "var(--space-2)" }}>
              Save the ones you like
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
              Create a free account to bookmark events, RSVP, and get a feed tuned to your interests.
            </p>
            <Link to="/register" className="btn btn--primary">Create an account</Link>
          </div>
        )}
      </section>
    </>
  );
}
