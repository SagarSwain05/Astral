import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertTriangle, ArrowRight, Orbit } from "lucide-react";
import useAsteroidStore from "../../stores/asteroidStore";
import useAuthStore from "../../stores/authStore";
import Countdown from "../hud/Countdown";

const AsteroidCard = ({ asteroid, index = 0, compact = false }) => {
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } =
    useAsteroidStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  // A button, not a nested link — the whole card is already a link
  const openIn3D = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/visualization?focus=${asteroid.neo_reference_id}`);
  };

  const isWatched = isInWatchlist(asteroid.neo_reference_id);

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

  const handleWatchToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) return;

    if (isWatched) {
      await removeFromWatchlist(asteroid.neo_reference_id);
    } else {
      await addToWatchlist(asteroid.neo_reference_id);
    }
  };

  const formatDistance = (km) => {
    if (!km) return "N/A";
    if (km > 1000000) {
      return `${(km / 1000000).toFixed(2)}M km`;
    }
    return `${Math.round(km).toLocaleString()} km`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (compact) {
    return (
      <Link to={`/asteroid/${asteroid.neo_reference_id}`}>
        <motion.div
          className="asteroid-card flex items-center gap-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ x: 5 }}
        >
          {/* Risk indicator */}
          <div
            className={`w-2 h-12 rounded-full ${
              asteroid.riskCategory === "high" ? "bg-risk-high"
              : asteroid.riskCategory === "moderate" ? "bg-risk-moderate"
              : asteroid.riskCategory === "low" ? "bg-risk-low"
              : "bg-risk-minimal"
            }`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {asteroid.isPotentiallyHazardous && (
                <AlertTriangle className="w-4 h-4 text-risk-high flex-shrink-0" />
              )}
              <p className="font-medium text-white truncate">{asteroid.name}</p>
            </div>
            <p className="text-sm text-white/50 flex flex-wrap items-center gap-x-2">
              {formatDate(asteroid.closeApproachDate)}
              <Countdown target={asteroid.closeApproachDate} compact />
            </p>
          </div>

          <div
            className={`px-2 py-1 rounded-lg text-xs font-bold ${getRiskBadgeClass(asteroid.riskCategory)}`}
          >
            {asteroid.riskScore}
          </div>

          <button
            type="button"
            onClick={openIn3D}
            className="p-1.5 rounded-lg hover:bg-accent-primary/20 text-white/30 hover:text-accent-primary transition-colors"
            title="View trajectory in 3D"
            aria-label="View trajectory in 3D"
          >
            <Orbit className="w-4 h-4" />
          </button>

          <ArrowRight className="w-4 h-4 text-white/30" />
        </motion.div>
      </Link>
    );
  }

  return (
    <Link to={`/asteroid/${asteroid.neo_reference_id}`}>
      <motion.div
        className="asteroid-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ y: -5 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {asteroid.isPotentiallyHazardous && (
              <AlertTriangle className="w-5 h-5 text-risk-high" />
            )}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskBadgeClass(asteroid.riskCategory)}`}
            >
              Risk: {asteroid.riskScore}
            </span>
          </div>

          {isAuthenticated && (
            <motion.button
              onClick={handleWatchToggle}
              className={`p-2 rounded-lg transition-colors ${
                isWatched ?
                  "bg-accent-primary/20 text-accent-primary"
                : "bg-white/5 text-white/50 hover:text-white"
              }`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isWatched ?
                <Eye className="w-4 h-4" />
              : <EyeOff className="w-4 h-4" />}
            </motion.button>
          )}
        </div>

        {/* Asteroid name */}
        <h3 className="text-lg font-bold text-white mb-1 truncate">
          {asteroid.name}
        </h3>
        <p className="text-sm text-white/50 mb-4 flex flex-wrap items-center gap-x-3">
          <span>ID: {asteroid.neo_reference_id}</span>
          <Countdown target={asteroid.closeApproachDate} compact />
        </p>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={openIn3D}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-medium hover:bg-accent-primary/20 transition-colors border border-accent-primary/20"
          >
            <Orbit className="w-3.5 h-3.5" />
            View in 3D
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-space-800/50 rounded-lg p-3">
            <p className="text-xs text-white/50">Distance</p>
            <p className="text-sm font-semibold text-white">
              {asteroid.missDistanceLunar?.toFixed(2)} LD
            </p>
            <p className="text-xs text-white/40">
              {formatDistance(asteroid.missDistanceKm)}
            </p>
          </div>
          <div className="bg-space-800/50 rounded-lg p-3">
            <p className="text-xs text-white/50">Velocity</p>
            <p className="text-sm font-semibold text-white">
              {asteroid.relativeVelocityKmS?.toFixed(1)} km/s
            </p>
            <p className="text-xs text-white/40">
              {Math.round(asteroid.relativeVelocityKmH || 0).toLocaleString()}{" "}
              km/h
            </p>
          </div>
          <div className="bg-space-800/50 rounded-lg p-3">
            <p className="text-xs text-white/50">Diameter</p>
            <p className="text-sm font-semibold text-white">
              {Math.round(asteroid.estimatedDiameterMax || 0)}m
            </p>
            <p className="text-xs text-white/40">max estimate</p>
          </div>
          <div className="bg-space-800/50 rounded-lg p-3">
            <p className="text-xs text-white/50">Approach</p>
            <p className="text-sm font-semibold text-white">
              {formatDate(asteroid.closeApproachDate)}
            </p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default AsteroidCard;
