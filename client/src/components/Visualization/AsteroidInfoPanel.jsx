import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  AlertTriangle,
  MoveRight,
  Gauge,
  Ruler,
  Target,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  formatDistance,
  formatVelocity,
  riskHex,
} from "../../utils/orbitalMechanics";
import useMediaQuery from "../../hooks/useMediaQuery";
import { useState } from "react";

const AsteroidInfoPanel = ({ asteroid, onClose, onNavigate }) => {
  if (!asteroid) return null;

  const color = riskHex(asteroid.riskCategory);
  const isCompact = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [expanded, setExpanded] = useState(false);

  // ── Compact / mobile layout: slim bottom card ──
  if (isCompact) {
    return (
      <AnimatePresence>
        <motion.div
          key={asteroid.neo_reference_id}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-x-0 bottom-[100px] mx-auto w-[calc(100%-1.5rem)] max-w-md rounded-2xl shadow-2xl glass z-20 overflow-hidden"
        >
          {/* Collapsed: single-row summary */}
          <div className="p-3 flex items-center gap-3">
            {/* Risk dot */}
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {/* Name + key stat */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-sm truncate">
                  {asteroid.name?.replace(/[()]/g, "").trim()}
                </h3>
                {asteroid.isPotentiallyHazardous && (
                  <AlertTriangle className="w-3.5 h-3.5 text-risk-high flex-shrink-0" />
                )}
              </div>
              <p className="text-white/50 text-xs truncate">
                {formatDistance(asteroid.missDistanceKm || 0)} &middot;{" "}
                {formatVelocity(asteroid.relativeVelocityKmS || 0)} &middot;{" "}
                {asteroid.estimatedDiameterMax?.toFixed(0) || "?"}m
              </p>
            </div>
            {/* Expand / collapse */}
            <button
              onClick={() => setExpanded((p) => !p)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"
            >
              {expanded ?
                <ChevronDown className="w-4 h-4" />
              : <ChevronUp className="w-4 h-4" />}
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Expanded: full details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 space-y-3">
                  {/* Risk Score */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Risk Score</span>
                      <span className="font-mono font-bold" style={{ color }}>
                        {asteroid.riskScore || 0}/100
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${asteroid.riskScore || 0}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-white/40 text-[10px]">Distance</p>
                      <p className="text-white font-medium text-xs">
                        {formatDistance(asteroid.missDistanceKm || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px]">Velocity</p>
                      <p className="text-white font-medium text-xs">
                        {formatVelocity(asteroid.relativeVelocityKmS || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px]">Diameter</p>
                      <p className="text-white font-medium text-xs">
                        {asteroid.estimatedDiameterMax?.toFixed(0) || "?"}m
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px]">Approach</p>
                      <p className="text-white font-medium text-xs">
                        {asteroid.closeApproachDate ?
                          new Date(
                            asteroid.closeApproachDate,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onNavigate?.(asteroid.neo_reference_id)}
                      className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1.5 py-2"
                    >
                      View Details
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    {asteroid.nasa_jpl_url && (
                      <a
                        href={asteroid.nasa_jpl_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-xs"
                      >
                        NASA
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Desktop layout: side panel ──
  return (
    <AnimatePresence>
      <motion.div
        key={asteroid.neo_reference_id}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="absolute top-4 right-4 w-80 glass p-5 space-y-4 z-20 max-h-[75vh] overflow-y-auto custom-scrollbar"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {asteroid.isPotentiallyHazardous && (
                <AlertTriangle className="w-4 h-4 text-risk-high flex-shrink-0" />
              )}
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: `${color}22`,
                  color: color,
                  border: `1px solid ${color}44`,
                }}
              >
                {asteroid.riskCategory?.toUpperCase()}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg leading-tight truncate">
              {asteroid.name?.replace(/[()]/g, "").trim()}
            </h3>
            <p className="text-white/40 text-xs font-mono mt-0.5">
              {asteroid.neo_reference_id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Risk Score Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-white/50">Risk Score</span>
            <span className="font-mono font-bold" style={{ color }}>
              {asteroid.riskScore || 0}/100
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${asteroid.riskScore || 0}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-white/40 text-xs">
              <Target className="w-3 h-3" />
              <span>Miss Distance</span>
            </div>
            <p className="text-white font-medium text-sm">
              {formatDistance(asteroid.missDistanceKm || 0)}
            </p>
            <p className="text-white/30 text-xs">
              {asteroid.missDistanceLunar?.toFixed(2)} LD
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-white/40 text-xs">
              <Gauge className="w-3 h-3" />
              <span>Velocity</span>
            </div>
            <p className="text-white font-medium text-sm">
              {formatVelocity(asteroid.relativeVelocityKmS || 0)}
            </p>
            <p className="text-white/30 text-xs">
              {((asteroid.relativeVelocityKmS || 0) * 3600).toFixed(0)} km/h
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-white/40 text-xs">
              <Ruler className="w-3 h-3" />
              <span>Diameter</span>
            </div>
            <p className="text-white font-medium text-sm">
              {asteroid.estimatedDiameterMax?.toFixed(0) || "?"}m
            </p>
            <p className="text-white/30 text-xs">
              {asteroid.estimatedDiameterMin?.toFixed(0) || "?"}–
              {asteroid.estimatedDiameterMax?.toFixed(0) || "?"}m range
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-white/40 text-xs">
              <MoveRight className="w-3 h-3" />
              <span>Approach</span>
            </div>
            <p className="text-white font-medium text-sm">
              {asteroid.closeApproachDate ?
                new Date(asteroid.closeApproachDate).toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                  },
                )
              : "N/A"}
            </p>
            <p className="text-white/30 text-xs">
              {asteroid.closeApproachDate ?
                new Date(asteroid.closeApproachDate).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )
              : ""}
            </p>
          </div>
        </div>

        {/* Brightness */}
        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-3">
          <span className="text-white/40">Absolute Magnitude</span>
          <span className="text-white font-mono">
            {asteroid.absolute_magnitude_h?.toFixed(2) || "N/A"} H
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onNavigate?.(asteroid.neo_reference_id)}
            className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1.5"
          >
            View Details
            <ExternalLink className="w-3 h-3" />
          </button>
          {asteroid.nasa_jpl_url && (
            <a
              href={asteroid.nasa_jpl_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors text-xs"
            >
              NASA
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AsteroidInfoPanel;
