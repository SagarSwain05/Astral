import { useEffect, useState, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Globe,
  RefreshCw,
  ChevronRight,
  Search,
  Sparkles,
  Orbit,
  Crosshair,
  BarChart3,
} from "lucide-react";
import useAsteroidStore from "../stores/asteroidStore";
import StatCard from "../components/Dashboard/StatCard";
import Ticker from "../components/Dashboard/Ticker";
import AsteroidCard from "../components/Asteroid/AsteroidCard";
import AsteroidOfTheDay from "../components/hud/AsteroidOfTheDay";
import { useTranslation } from "react-i18next";

// Lazy load 3D Earth for performance
const Earth3D = lazy(() => import("../components/Visualization/Earth3D"));

const Dashboard = () => {
  const {
    todayAsteroids,
    flybys,
    fetchFlybys,
    asteroids,
    stats,
    fetchTodayAsteroids,
    fetchAsteroids,
    fetchStats,
    isLoading,
  } = useAsteroidStore();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [show3D, setShow3D] = useState(true);

  useEffect(() => {
    fetchTodayAsteroids();
    fetchAsteroids();
    fetchStats();
    fetchFlybys(7);
  }, []);

  const filteredAsteroids = asteroids.filter((asteroid) => {
    if (
      searchQuery &&
      !asteroid.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filter === "hazardous" && !asteroid.isPotentiallyHazardous)
      return false;
    if (filter === "high" && asteroid.riskCategory !== "high") return false;
    if (filter === "moderate" && asteroid.riskCategory !== "moderate")
      return false;
    if (filter === "low" && asteroid.riskCategory !== "low") return false;
    return true;
  });

  const closestApproach =
    todayAsteroids.length > 0 ?
      todayAsteroids.reduce((prev, curr) =>
        (
          (curr.missDistanceLunar || Infinity) <
          (prev.missDistanceLunar || Infinity)
        ) ?
          curr
        : prev,
      )
    : null;

  return (
    <div className="min-h-screen pt-24 pb-12 sm:pb-16">
      {/* Hero Section with 3D Earth */}
      <section className="relative px-4 sm:px-6 py-8 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Background glow */}
          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-primary/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Text content */}
            <motion.div
              className="relative z-10"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-accent-primary" />
                <span className="text-accent-primary font-medium">
                  {t("dashboard.realtime")}
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className="text-white">{t("dashboard.titleA")}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">
                  {t("dashboard.titleB")}
                </span>
              </h1>

              <p className="text-white/60 text-lg mb-8 max-w-lg">
                {t("dashboard.subtitle")}
              </p>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-3">
                <div className="glass px-4 py-3 flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                    <Crosshair className="w-5 h-5 text-accent-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {closestApproach?.missDistanceLunar?.toFixed(1) || "—"}
                    </p>
                    <p className="text-xs text-white/50">{t("dashboard.closestLd")}</p>
                  </div>
                </div>
                <div className="glass px-4 py-3 flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-lg bg-accent-secondary/20 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-accent-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {todayAsteroids.length}
                    </p>
                    <p className="text-xs text-white/50">{t("dashboard.trackedToday")}</p>
                  </div>
                </div>
                <div className="glass px-4 py-3 flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-lg bg-risk-high/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-risk-high" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {
                        todayAsteroids.filter((a) => a.isPotentiallyHazardous)
                          .length
                      }
                    </p>
                    <p className="text-xs text-white/50">{t("common.hazardous")}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3D Earth */}
            <motion.div
              className="relative h-[280px] sm:h-[360px] lg:h-[500px]"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {show3D ?
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center glass rounded-2xl">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white/50">
                          Loading 3D visualization...
                        </p>
                      </div>
                    </div>
                  }
                >
                  <Earth3D
                    asteroids={flybys}
                    compact
                    showLabels={false}
                    className="w-full h-full rounded-2xl overflow-hidden"
                    onSelectAsteroid={(a) =>
                      navigate(`/visualization?focus=${a.neo_reference_id}`)
                    }
                  />
                  <Link
                    to="/visualization"
                    className="absolute bottom-3 left-3 right-3 sm:right-auto glass px-3 py-2 text-xs text-white/70 hover:text-white flex items-center gap-2"
                  >
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                      <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
                    </span>
                    {flybys.length} real flyby trajectories · click an asteroid or open the full 3D view
                  </Link>
                </Suspense>
              : <div className="w-full h-full glass rounded-2xl flex items-center justify-center">
                  <button
                    onClick={() => setShow3D(true)}
                    className="btn-primary"
                  >
                    Enable 3D View
                  </button>
                </div>
              }
            </motion.div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <section className="px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <Ticker items={todayAsteroids} />
        </div>
      </section>

      {/* Asteroid of the Day */}
      <section className="px-4 sm:px-6 pt-8">
        <div className="max-w-7xl mx-auto">
          <AsteroidOfTheDay />
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={Crosshair}
              iconColor="text-accent-primary"
              bgColor="bg-accent-primary/20"
              label={t("dashboard.closestToday")}
              value={closestApproach?.missDistanceLunar?.toFixed(2) || "—"}
              subValue={t("dashboard.lunarDistances")}
              delay={0}
            />
            <StatCard
              icon={Globe}
              iconColor="text-accent-secondary"
              bgColor="bg-accent-secondary/20"
              label={t("dashboard.trackedToday")}
              value={todayAsteroids.length}
              subValue={t("dashboard.activeObjects")}
              delay={0.1}
            />
            <StatCard
              icon={AlertTriangle}
              iconColor="text-risk-high"
              bgColor="bg-risk-high/20"
              label={t("common.hazardous")}
              value={
                stats?.hazardous ||
                todayAsteroids.filter((a) => a.isPotentiallyHazardous).length
              }
              subValue={t("dashboard.potentiallyDangerous")}
              trend="up"
              delay={0.2}
            />
            <StatCard
              icon={BarChart3}
              iconColor="text-sky-400"
              bgColor="bg-sky-400/20"
              label={t("dashboard.avgRisk")}
              value={
                todayAsteroids.length > 0 ?
                  Math.round(
                    todayAsteroids.reduce(
                      (sum, a) => sum + (a.riskScore || 0),
                      0,
                    ) / todayAsteroids.length,
                  )
                : "—"
              }
              subValue={t("common.riskScore")}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Asteroid Feed */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between items-start gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{t("dashboard.feed")}</h2>
              <p className="text-white/50">
                {t("dashboard.objectsFound", { count: filteredAsteroids.length })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder={t("dashboard.search")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-1 bg-space-800 rounded-lg p-1 overflow-x-auto w-full sm:w-auto -mx-1 px-1">
                {["all", "hazardous", "high", "moderate", "low"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      filter === f ?
                        "bg-accent-primary text-space-900"
                      : "text-white/60 hover:text-white"
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Refresh */}
              <motion.button
                onClick={() => {
                  fetchTodayAsteroids();
                  fetchAsteroids();
                }}
                className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">{t("common.refresh")}</span>
              </motion.button>
            </div>
          </div>

          {/* Asteroid Grid */}
          {isLoading ?
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass h-64 animate-pulse" />
              ))}
            </div>
          : filteredAsteroids.length > 0 ?
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAsteroids.slice(0, 12).map((asteroid, index) => (
                <AsteroidCard
                  key={asteroid.neo_reference_id || asteroid._id}
                  asteroid={asteroid}
                  index={index}
                />
              ))}
            </div>
          : <div className="glass p-12 text-center">
              <Globe className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/50">
                No asteroids found matching your criteria
              </p>
            </div>
          }

          {/* View All Button */}
          {filteredAsteroids.length > 12 && (
            <div className="mt-8 text-center">
              <Link to="/asteroids">
                <motion.button
                  className="btn-secondary inline-flex items-center gap-2"
                  whileHover={{ scale: 1.02, x: 5 }}
                >
                  View All {filteredAsteroids.length} Asteroids
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* High Risk Section */}
      {todayAsteroids.filter(
        (a) => a.riskCategory === "high" || a.isPotentiallyHazardous,
      ).length > 0 && (
        <section className="px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="glass border-risk-high/30 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col gap-4 items-start md:flex-row md:items-center md:justify-between mb-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-risk-high" />
                  <h3 className="text-xl font-bold text-risk-high">
                    {t("dashboard.highRiskObjects")}
                  </h3>
                </div>
                <Link
                  to="/visualization"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-sm font-medium hover:bg-accent-primary/20 transition-all"
                >
                  <Orbit className="w-4 h-4" />
                  View All in 3D
                </Link>
              </div>
              <p className="text-white/50 mb-4">
                These asteroids require close monitoring due to their size,
                velocity, or proximity.
              </p>
              <div className="grid gap-2">
                {todayAsteroids
                  .filter(
                    (a) =>
                      a.riskCategory === "high" || a.isPotentiallyHazardous,
                  )
                  .slice(0, 5)
                  .map((asteroid, index) => (
                    <AsteroidCard
                      key={asteroid.neo_reference_id}
                      asteroid={asteroid}
                      index={index}
                      compact
                    />
                  ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
