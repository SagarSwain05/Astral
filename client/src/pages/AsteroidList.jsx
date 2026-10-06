import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpDown,
  X,
  RefreshCw,
  Loader2,
  CalendarRange,
  DownloadCloud,
} from "lucide-react";
import AsteroidCard from "../components/Asteroid/AsteroidCard";
import { asteroidApi } from "../services/api";
import useInfiniteScroll from "../hooks/useInfiniteScroll";
import useDebounce from "../hooks/useDebounce";

const DEFAULT_FILTERS = {
  riskCategory: "",
  hazardousOnly: false,
  sortBy: "closeApproachDate",
  order: "asc",
  startDate: "",
  endDate: "",
  minDiameter: "",
  maxDiameter: "",
  minVelocity: "",
  maxVelocity: "",
  maxDistance: "",
};

// Numeric / date filters forwarded to GET /api/asteroids as-is
const RANGE_KEYS = [
  "startDate",
  "endDate",
  "minDiameter",
  "maxDiameter",
  "minVelocity",
  "maxVelocity",
  "maxDistance",
];

const toISODate = (d) => d.toISOString().split("T")[0];

const AsteroidList = () => {
  // Infinite-scroll state (replaces old pagination)
  const [allAsteroids, setAllAsteroids] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const itemsPerPage = 24;

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [syncState, setSyncState] = useState({ loading: false, message: "" });
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Reset list when filters change
  const filtersRef = useRef(filters);
  const searchRef = useRef(debouncedSearch);
  useEffect(() => {
    filtersRef.current = filters;
    searchRef.current = debouncedSearch;
    setAllAsteroids([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, [filters, debouncedSearch]);

  // Fetch a page of asteroids
  // Each request gets an id so responses for outdated filters are dropped
  const requestIdRef = useRef(0);
  const isLoadingRef = useRef(false);

  const loadPage = useCallback(
    async (pageNum) => {
      // Page 1 (filter change / refresh) always wins; extra pages wait
      if (pageNum > 1 && isLoadingRef.current) return;
      const requestId = ++requestIdRef.current;
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const params = {
        page: pageNum,
        limit: itemsPerPage,
        sortBy: filtersRef.current.sortBy,
        order: filtersRef.current.order,
      };
      if (filtersRef.current.riskCategory)
        params.riskCategory = filtersRef.current.riskCategory;
      if (filtersRef.current.hazardousOnly) params.hazardousOnly = "true";
      for (const key of RANGE_KEYS) {
        if (filtersRef.current[key] !== "") params[key] = filtersRef.current[key];
      }
      if (searchRef.current.trim()) params.search = searchRef.current.trim();

      try {
        const res = await asteroidApi.getAll(params);
        if (requestId !== requestIdRef.current) return;
        const { data, pagination } = res.data;
        setAllAsteroids((prev) => (pageNum === 1 ? data : [...prev, ...data]));
        setTotalCount(pagination.total);
        setHasMore(pagination.hasMore);
        setPage(pageNum);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err.response?.data?.message || "Failed to fetch asteroids");
      } finally {
        if (requestId === requestIdRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [],
  );

  // Initial + filter-change fetch
  useEffect(() => {
    loadPage(1);
  }, [filters, debouncedSearch]);

  // Triggered when sentinel enters viewport
  const fetchNextPage = useCallback(() => {
    if (!isLoading && hasMore) loadPage(page + 1);
  }, [isLoading, hasMore, page, loadPage]);

  const sentinelRef = useInfiniteScroll(fetchNextPage, {
    enabled: hasMore && !isLoading,
  });

  // Search is applied server-side (debounced); this only covers the gap
  // while the debounce is pending
  const filteredAsteroids = useMemo(() => {
    if (!searchQuery.trim()) return allAsteroids;
    const q = searchQuery.toLowerCase();
    return allAsteroids.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) || a.neo_reference_id?.includes(q),
    );
  }, [allAsteroids, searchQuery]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setSyncState({ loading: false, message: "" });
  };

  // Quick 7-day windows for the Date Range Picker
  const applyWindow = (offsetDays) => {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + offsetDays);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    setFilters((prev) => ({
      ...prev,
      startDate: toISODate(start),
      endDate: toISODate(end),
    }));
  };

  // Pull the selected window from NASA (max 7 days) into the cache
  const syncFromNasa = async () => {
    if (!filters.startDate) return;
    const end = filters.endDate || filters.startDate;
    const spanDays =
      (new Date(end) - new Date(filters.startDate)) / 86400000;
    if (spanDays < 0 || spanDays > 6) {
      setSyncState({
        loading: false,
        message: "Pick a window of at most 7 days to fetch from NASA.",
      });
      return;
    }
    setSyncState({ loading: true, message: "" });
    try {
      const res = await asteroidApi.syncRange(filters.startDate, end);
      setSyncState({
        loading: false,
        message: `Fetched ${res.data.data.processed} objects from NASA.`,
      });
      setFilters((prev) => ({ ...prev }));
    } catch (err) {
      setSyncState({
        loading: false,
        message: err.response?.data?.message || "NASA sync failed",
      });
    }
  };

  const hasActiveFilters =
    filters.riskCategory ||
    filters.hazardousOnly ||
    RANGE_KEYS.some((k) => filters[k] !== "") ||
    searchQuery;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">All Asteroids</h1>
          <p className="text-white/50">
            Browse and filter {totalCount.toLocaleString()} tracked Near-Earth
            Objects
          </p>
        </motion.div>

        {/* Search and Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-4 mb-6"
        >
          <div className="flex flex-wrap gap-4 items-stretch">
            {/* Search */}
            <div className="relative flex-1 min-w-0 w-full sm:min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto ${showFilters ? "border-accent-primary" : ""}`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-accent-primary rounded-full" />
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => {
                setAllAsteroids([]);
                setPage(1);
                setHasMore(true);
                loadPage(1);
              }}
              disabled={isLoading}
              className="btn-ghost p-2.5 w-full sm:w-auto flex justify-center"
            >
              <RefreshCw
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Expanded Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Risk Category */}
                  <div>
                    <label className="block text-sm text-white/50 mb-2">
                      Risk Category
                    </label>
                    <select
                      value={filters.riskCategory}
                      onChange={(e) =>
                        handleFilterChange("riskCategory", e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="">All Categories</option>
                      <option value="high">High Risk</option>
                      <option value="moderate">Moderate Risk</option>
                      <option value="low">Low Risk</option>
                      <option value="minimal">Minimal Risk</option>
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm text-white/50 mb-2">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) =>
                        handleFilterChange("sortBy", e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="closeApproachDate">Approach Date</option>
                      <option value="riskScore">Risk Score</option>
                      <option value="missDistanceKm">Distance</option>
                      <option value="estimatedDiameterMax">Size</option>
                      <option value="relativeVelocityKmS">Velocity</option>
                    </select>
                  </div>

                  {/* Order */}
                  <div>
                    <label className="block text-sm text-white/50 mb-2">
                      Order
                    </label>
                    <select
                      value={filters.order}
                      onChange={(e) =>
                        handleFilterChange("order", e.target.value)
                      }
                      className="input-field"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>

                  {/* Hazardous Only */}
                  <div className="flex items-end">
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-space-800/50 rounded-xl border border-white/10 w-full">
                      <input
                        type="checkbox"
                        checked={filters.hazardousOnly}
                        onChange={(e) =>
                          handleFilterChange("hazardousOnly", e.target.checked)
                        }
                        className="w-5 h-5 rounded border-white/20 bg-space-700 text-accent-primary focus:ring-accent-primary/50"
                      />
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-risk-high" />
                        <span className="text-white">Hazardous Only</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Date Range Picker */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarRange className="w-4 h-4 text-accent-primary" />
                    <span className="text-sm font-medium text-white">
                      Close Approach Window
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-sm text-white/50 mb-2">
                        From
                      </label>
                      <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          handleFilterChange("startDate", e.target.value)
                        }
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/50 mb-2">
                        To
                      </label>
                      <input
                        type="date"
                        value={filters.endDate}
                        min={filters.startDate || undefined}
                        onChange={(e) =>
                          handleFilterChange("endDate", e.target.value)
                        }
                        className="input-field"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => applyWindow(-7)}
                        className="btn-ghost flex-1 text-sm"
                      >
                        Past 7d
                      </button>
                      <button
                        onClick={() => applyWindow(0)}
                        className="btn-ghost flex-1 text-sm"
                      >
                        Next 7d
                      </button>
                    </div>
                    <button
                      onClick={syncFromNasa}
                      disabled={!filters.startDate || syncState.loading}
                      className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                      title="Fetch this window from NASA NeoWs if it is not cached yet"
                    >
                      {syncState.loading ?
                        <Loader2 className="w-4 h-4 animate-spin" />
                      : <DownloadCloud className="w-4 h-4" />}
                      Fetch from NASA
                    </button>
                  </div>
                  {syncState.message && (
                    <p className="text-sm text-white/50 mt-2">
                      {syncState.message}
                    </p>
                  )}
                </div>

                {/* Size / Speed / Distance */}
                <div className="pt-4 mt-4 border-t border-white/10 grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    ["minDiameter", "Min size (m)", "e.g. 500"],
                    ["maxDiameter", "Max size (m)", ""],
                    ["minVelocity", "Min speed (km/s)", ""],
                    ["maxVelocity", "Max speed (km/s)", ""],
                    ["maxDistance", "Max distance (LD)", "e.g. 10"],
                  ].map(([key, label, placeholder]) => (
                    <div key={key}>
                      <label className="block text-sm text-white/50 mb-2">
                        {label}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={filters[key]}
                        placeholder={placeholder}
                        onChange={(e) => handleFilterChange(key, e.target.value)}
                        className="input-field"
                      />
                    </div>
                  ))}
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={clearFilters}
                      className="text-sm text-white/50 hover:text-white flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear all filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <p className="text-white/50">
            Showing {filteredAsteroids.length} of {totalCount.toLocaleString()}{" "}
            asteroids
          </p>
        </div>

        {/* Error State */}
        {error && !isLoading && allAsteroids.length === 0 && (
          <div className="glass p-8 text-center">
            <p className="text-risk-high mb-4">{error}</p>
            <button onClick={() => loadPage(1)} className="btn-primary">
              Try Again
            </button>
          </div>
        )}

        {/* Asteroids Grid – Infinite scroll */}
        {!error || allAsteroids.length > 0 ?
          <>
            {filteredAsteroids.length === 0 && !isLoading ?
              <div className="glass p-12 text-center">
                <p className="text-white/50 text-lg mb-4">No asteroids found</p>
                <button onClick={clearFilters} className="btn-secondary">
                  Clear Filters
                </button>
              </div>
            : <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredAsteroids.map((asteroid, index) => (
                  <AsteroidCard
                    key={asteroid.neo_reference_id}
                    asteroid={asteroid}
                    index={index}
                  />
                ))}
              </motion.div>
            }

            {/* Sentinel element triggers next page load */}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center py-10"
              >
                <Loader2 className="w-8 h-8 text-accent-primary/60 animate-spin" />
                <span className="ml-3 text-white/40 text-sm">
                  Loading more asteroids...
                </span>
              </div>
            )}

            {!hasMore && allAsteroids.length > 0 && (
              <p className="text-center text-white/30 text-sm py-8">
                You've reached the end — {totalCount.toLocaleString()} asteroids
                loaded
              </p>
            )}
          </>
        : null}
      </div>
    </div>
  );
};

export default AsteroidList;
