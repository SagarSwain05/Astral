import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  AlertTriangle,
  Gauge,
  ExternalLink,
  Calendar,
  Ruler,
  Zap,
  Target,
  Globe,
  Share2,
  Bookmark,
} from "lucide-react";
import useAsteroidStore from "../stores/asteroidStore";
import useAuthStore from "../stores/authStore";
import AsteroidChat from "../components/Chat/AsteroidChat";
import Countdown from "../components/hud/Countdown";
import ApproachTimeline from "../components/hud/ApproachTimeline";

const AsteroidDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    selectedAsteroid,
    fetchAsteroidById,
    isLoading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
  } = useAsteroidStore();
  const { isAuthenticated } = useAuthStore();
  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAsteroidById(id);
    }
  }, [id]);

  useEffect(() => {
    if (selectedAsteroid) {
      setIsWatched(isInWatchlist(selectedAsteroid.neo_reference_id));
    }
  }, [selectedAsteroid, isInWatchlist]);

  const handleWatchToggle = async () => {
    if (!isAuthenticated || !selectedAsteroid) return;

    if (isWatched) {
      await removeFromWatchlist(selectedAsteroid.neo_reference_id);
      setIsWatched(false);
    } else {
      await addToWatchlist(selectedAsteroid.neo_reference_id);
      setIsWatched(true);
    }
  };

  const getRiskBadgeClass = (category) => {
    switch (category) {
      case "high":
        return "badge-high";
      case "moderate":
        return "badge-moderate";
      case "low":
        return "badge-low";
      default:
        return "badge-minimal";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Size comparison data
  const getSizeComparison = (diameterM) => {
    if (!diameterM) return null;
    if (diameterM < 10)
      return { name: "Car", icon: "🚗", scale: diameterM / 5 };
    if (diameterM < 50)
      return { name: "Blue Whale", icon: "🐋", scale: diameterM / 30 };
    if (diameterM < 100)
      return { name: "Statue of Liberty", icon: "🗽", scale: diameterM / 93 };
    if (diameterM < 200)
      return { name: "Football Field", icon: "🏈", scale: diameterM / 110 };
    if (diameterM < 450)
      return {
        name: "Empire State Building",
        icon: "🏢",
        scale: diameterM / 443,
      };
    return { name: "Eiffel Tower", icon: "🗼", scale: diameterM / 330 };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Loading asteroid data...</p>
        </div>
      </div>
    );
  }

  if (!selectedAsteroid) {
    return (
      <div className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <div className="text-center glass p-12 max-w-md">
          <AlertTriangle className="w-16 h-16 text-risk-moderate mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Asteroid Not Found
          </h2>
          <p className="text-white/50 mb-6">
            The asteroid you're looking for doesn't exist in our database.
          </p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const asteroid = selectedAsteroid;
  const sizeComparison = getSizeComparison(asteroid.estimatedDiameterMax);

  return (
    <div className="min-h-screen pt-24 pb-12">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 py-12 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          {/* Background glow based on risk */}
          <div
            className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[150px] pointer-events-none ${
              asteroid.riskCategory === "high" ? "bg-risk-high/20"
              : asteroid.riskCategory === "moderate" ? "bg-risk-moderate/20"
              : "bg-accent-primary/20"
            } hidden md:block`}
          />

          {/* Back button */}
          <motion.button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/50 hover:text-white mb-6 transition-colors"
            whileHover={{ x: -5 }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </motion.button>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                {asteroid.isPotentiallyHazardous && (
                  <span className="px-3 py-1 bg-risk-high/20 text-risk-high border border-risk-high/30 rounded-full text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Potentially Hazardous
                  </span>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-sm font-bold ${getRiskBadgeClass(asteroid.riskCategory)}`}
                >
                  Risk Score: {asteroid.riskScore}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {asteroid.name}
              </h1>
              <p className="text-white/50 text-lg">
                NEO Reference ID: {asteroid.neo_reference_id}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {isAuthenticated && (
                <motion.button
                  onClick={handleWatchToggle}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 justify-center transition-all w-full sm:w-auto ${
                    isWatched ?
                      "bg-accent-primary text-space-900"
                    : "btn-secondary"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isWatched ?
                    <>
                      <Eye className="w-5 h-5" />
                      Watching
                    </>
                  : <>
                      <EyeOff className="w-5 h-5" />
                      Watch
                    </>
                  }
                </motion.button>
              )}
              <button
                onClick={() => {
                  const url = window.location.href;
                  if (navigator.share) {
                    navigator
                      .share({
                        title: `Asteroid ${asteroid.name}`,
                        text: `Check out asteroid ${asteroid.name} on Astral Tracker!`,
                        url,
                      })
                      .catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url);
                  }
                }}
                className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
              <a
                href={
                  asteroid.nasaJplUrl ||
                  `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${asteroid.neo_reference_id}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <ExternalLink className="w-5 h-5" />
                NASA JPL
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <motion.div
              className="glass p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Target className="w-8 h-8 text-accent-primary mb-3" />
              <p className="text-white/50 text-sm">Miss Distance</p>
              <p className="text-2xl font-bold text-white">
                {asteroid.missDistanceLunar?.toFixed(2)} LD
              </p>
              <p className="text-white/40 text-sm">
                {Math.round(asteroid.missDistanceKm || 0).toLocaleString()} km
              </p>
            </motion.div>

            <motion.div
              className="glass p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Zap className="w-8 h-8 text-risk-moderate mb-3" />
              <p className="text-white/50 text-sm">Velocity</p>
              <p className="text-2xl font-bold text-white">
                {asteroid.relativeVelocityKmS?.toFixed(2)} km/s
              </p>
              <p className="text-white/40 text-sm">
                {Math.round(asteroid.relativeVelocityKmH || 0).toLocaleString()}{" "}
                km/h
              </p>
            </motion.div>

            <motion.div
              className="glass p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Ruler className="w-8 h-8 text-accent-secondary mb-3" />
              <p className="text-white/50 text-sm">Diameter</p>
              <p className="text-2xl font-bold text-white">
                {Math.round(asteroid.estimatedDiameterMax || 0)}m
              </p>
              <p className="text-white/40 text-sm">
                {Math.round(asteroid.estimatedDiameterMin || 0)}m -{" "}
                {Math.round(asteroid.estimatedDiameterMax || 0)}m
              </p>
            </motion.div>

            <motion.div
              className="glass p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Calendar className="w-8 h-8 text-risk-minimal mb-3" />
              <p className="text-white/50 text-sm">Close Approach</p>
              <p className="text-lg font-bold text-white">
                {new Date(asteroid.closeApproachDate).toLocaleDateString()}
              </p>
              <p className="text-white/40 text-sm">
                {new Date(asteroid.closeApproachDate).toLocaleTimeString()}
              </p>
              <Countdown
                target={asteroid.closeApproachDate}
                compact
                className="mt-2"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Size Comparison Section */}
      {sizeComparison && (
        <section className="px-4 sm:px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              Size Comparison
            </h2>
            <motion.div
              className="glass p-6 sm:p-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-center">
                <div className="text-center">
                  <div className="text-6xl mb-3">{sizeComparison.icon}</div>
                  <p className="text-white/70">{sizeComparison.name}</p>
                </div>
                <div className="text-white/30 text-4xl">=</div>
                <div className="text-center">
                  <div className="text-6xl mb-3">🪨</div>
                  <p className="text-white/70">This Asteroid</p>
                  <p className="text-2xl font-bold text-accent-primary mt-2">
                    {sizeComparison.scale.toFixed(1)}x
                  </p>
                </div>
              </div>

              {/* Visual bar comparison */}
              <div className="mt-8 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <span className="w-full md:w-32 md:text-right text-white/50">
                    {sizeComparison.name}
                  </span>
                  <div className="w-full bg-space-700 rounded-full h-4">
                    <div
                      className="bg-white/30 h-full rounded-full"
                      style={{ width: "30%" }}
                    />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <span className="w-full md:w-32 md:text-right text-white/50">
                    Asteroid
                  </span>
                  <div className="w-full bg-space-700 rounded-full h-4">
                    <motion.div
                      className="bg-gradient-to-r from-accent-primary to-accent-secondary h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, sizeComparison.scale * 30)}%`,
                      }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Risk Analysis */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">Risk Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              className="glass p-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Risk Factors
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Hazardous Status</span>
                    <span
                      className={
                        asteroid.isPotentiallyHazardous ? "text-risk-high" : (
                          "text-risk-minimal"
                        )
                      }
                    >
                      {asteroid.isPotentiallyHazardous ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="h-2 bg-space-700 rounded-full">
                    <div
                      className={`h-full rounded-full ${asteroid.isPotentiallyHazardous ? "bg-risk-high" : "bg-risk-minimal"}`}
                      style={{
                        width: asteroid.isPotentiallyHazardous ? "100%" : "10%",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Size Factor</span>
                    <span className="text-white">
                      {Math.round(asteroid.estimatedDiameterMax || 0)}m
                    </span>
                  </div>
                  <div className="h-2 bg-space-700 rounded-full">
                    <div
                      className="h-full rounded-full bg-accent-secondary"
                      style={{
                        width: `${Math.min(100, (asteroid.estimatedDiameterMax || 0) / 10)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Proximity</span>
                    <span className="text-white">
                      {asteroid.missDistanceLunar?.toFixed(2)} LD
                    </span>
                  </div>
                  <div className="h-2 bg-space-700 rounded-full">
                    <div
                      className="h-full rounded-full bg-risk-moderate"
                      style={{
                        width: `${Math.max(5, 100 - (asteroid.missDistanceLunar || 50) * 2)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Velocity</span>
                    <span className="text-white">
                      {asteroid.relativeVelocityKmS?.toFixed(1)} km/s
                    </span>
                  </div>
                  <div className="h-2 bg-space-700 rounded-full">
                    <div
                      className="h-full rounded-full bg-risk-low"
                      style={{
                        width: `${Math.min(100, (asteroid.relativeVelocityKmS || 0) * 5)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="glass p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="text-lg font-semibold text-white mb-4">
                Overall Assessment
              </h3>
              <div className="flex items-center justify-center py-8">
                <div className="relative">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      className="stroke-space-700"
                      strokeWidth="12"
                      fill="none"
                    />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="88"
                      className={`${
                        asteroid.riskCategory === "high" ? "stroke-risk-high"
                        : asteroid.riskCategory === "moderate" ?
                          "stroke-risk-moderate"
                        : asteroid.riskCategory === "low" ? "stroke-risk-low"
                        : "stroke-risk-minimal"
                      }`}
                      strokeWidth="12"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={553}
                      initial={{ strokeDashoffset: 553 }}
                      animate={{
                        strokeDashoffset:
                          553 - (asteroid.riskScore / 100) * 553,
                      }}
                      transition={{ duration: 1.5, delay: 0.3 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-white">
                      {asteroid.riskScore}
                    </span>
                    <span
                      className={`text-sm font-medium capitalize ${
                        asteroid.riskCategory === "high" ? "text-risk-high"
                        : asteroid.riskCategory === "moderate" ?
                          "text-risk-moderate"
                        : asteroid.riskCategory === "low" ? "text-risk-low"
                        : "text-risk-minimal"
                      }`}
                    >
                      {asteroid.riskCategory} Risk
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Approach History Timeline */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            Approach History
          </h2>
          <ApproachTimeline
            key={asteroid.neo_reference_id}
            asteroidId={asteroid.neo_reference_id}
          />
        </div>
      </section>

      {/* Additional Info */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            Orbital Information
          </h2>
          <motion.div
            className="glass p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-white/50 text-sm">Orbiting Body</p>
                <p className="text-lg font-semibold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-accent-primary" />
                  {asteroid.orbitingBody || "Earth"}
                </p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Absolute Magnitude</p>
                <p className="text-lg font-semibold text-white">
                  {asteroid.absolute_magnitude_h?.toFixed(2) || "N/A"} H
                </p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Close Approach Date</p>
                <p className="text-lg font-semibold text-white">
                  {formatDate(asteroid.closeApproachDate)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Asteroid Discussion */}
      <section className="px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            Community Discussion
          </h2>
          <AsteroidChat
            asteroidId={asteroid.neo_reference_id}
            asteroidName={asteroid.name}
          />
        </div>
      </section>
    </div>
  );
};

export default AsteroidDetail;
