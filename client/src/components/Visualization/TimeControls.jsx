import { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import useMediaQuery from "../../hooks/useMediaQuery";

const SPEED_OPTIONS = [
  { label: "0.5×", value: 0.5 },
  { label: "1×", value: 1 },
  { label: "2×", value: 2 },
  { label: "5×", value: 5 },
  { label: "10×", value: 10 },
];

// Day markers for the timeline
const DAY_MARKERS = [-7, -5, -3, -1, 0, 1, 3, 5, 7];

const TimeControls = ({
  timeOffset,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
  maxHours = 168,
}) => {
  const trackRef = useRef(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Clamp timeOffset to bounds
  const clampedOffset = Math.max(-maxHours, Math.min(maxHours, timeOffset));

  // Format time offset to readable string
  const formatTime = (hours) => {
    const absHours = Math.abs(hours);
    const sign = hours < 0 ? "−" : "+";
    if (absHours < 1) return `${sign}${Math.round(absHours * 60)}m`;
    if (absHours < 24) return `${sign}${absHours.toFixed(1)}h`;
    const days = Math.floor(absHours / 24);
    const rem = Math.round(absHours % 24);
    return `${sign}${days}d ${rem}h`;
  };

  const getProjectedDate = (hours) => {
    const date = new Date(Date.now() + hours * 3600000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 0-100 percentage of the thumb position
  const pct = ((clampedOffset + maxHours) / (maxHours * 2)) * 100;

  const handleSliderChange = useCallback(
    (e) => onTimeChange(parseFloat(e.target.value)),
    [onTimeChange],
  );

  const nudgeTime = useCallback(
    (delta) => {
      onTimeChange(
        Math.max(-maxHours, Math.min(maxHours, clampedOffset + delta)),
      );
    },
    [clampedOffset, maxHours, onTimeChange],
  );

  const resetTime = useCallback(() => onTimeChange(0), [onTimeChange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full px-4 pb-3"
    >
      <div className={`glass ${isMobile ? "p-2" : "p-3"} max-w-2xl mx-auto`}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Time Projection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-xs hidden sm:inline">
              {getProjectedDate(clampedOffset)}
            </span>
            <span className="font-mono text-accent-primary font-semibold text-sm">
              {formatTime(clampedOffset)}
            </span>
          </div>
        </div>

        {/* Timeline track */}
        <div ref={trackRef} className="relative px-1 mb-1">
          {/* Background track */}
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            {/* Fill bar — contained inside the track, cannot overflow */}
            <div
              className="h-full rounded-full transition-all duration-100 ease-out"
              style={{
                marginLeft: `${Math.min(pct, 50)}%`,
                width: `${Math.abs(pct - 50)}%`,
                background:
                  clampedOffset >= 0 ?
                    "linear-gradient(90deg, rgba(0,212,255,0.5), rgba(0,212,255,0.8))"
                  : "linear-gradient(90deg, rgba(99,102,241,0.8), rgba(99,102,241,0.5))",
              }}
            />
          </div>

          {/* Day marker ticks */}
          <div className="absolute inset-x-1 top-0 h-1.5 pointer-events-none">
            {DAY_MARKERS.map((d) => {
              const mPct = ((d * 24 + maxHours) / (maxHours * 2)) * 100;
              return (
                <div
                  key={d}
                  className={`absolute top-0 w-px h-full ${
                    d === 0 ? "bg-white/30" : "bg-white/[0.08]"
                  }`}
                  style={{ left: `${mPct}%` }}
                />
              );
            })}
          </div>

          {/* Range input (invisible but interactive — sits over the track) */}
          <input
            type="range"
            min={-maxHours}
            max={maxHours}
            step={0.5}
            value={clampedOffset}
            onChange={handleSliderChange}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-5 appearance-none bg-transparent cursor-pointer z-10
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3.5
              [&::-webkit-slider-thumb]:h-3.5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-accent-primary
              [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,212,255,0.5)]
              [&::-webkit-slider-thumb]:border-[1.5px]
              [&::-webkit-slider-thumb]:border-white/40
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-webkit-slider-thumb]:transition-transform
              [&::-moz-range-thumb]:w-3.5
              [&::-moz-range-thumb]:h-3.5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-accent-primary
              [&::-moz-range-thumb]:border-[1.5px]
              [&::-moz-range-thumb]:border-white/40
              [&::-moz-range-thumb]:cursor-grab
              [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-moz-range-track]:bg-transparent"
          />
        </div>

        {/* Tick labels */}
        <div className="flex justify-between text-[10px] text-white/25 px-1 mb-2 select-none">
          <span>−7d</span>
          <span>−3d</span>
          <span className="text-white/40 font-medium">Now</span>
          <span>+3d</span>
          <span>+7d</span>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => nudgeTime(-1)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="−1 hour"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`p-2 rounded-xl transition-all ${
              isPlaying ?
                "bg-accent-primary/20 text-accent-primary shadow-lg shadow-accent-primary/20"
              : "bg-white/10 text-white hover:bg-white/15"
            }`}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ?
              <Pause className="w-4 h-4" />
            : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => nudgeTime(1)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="+1 hour"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button
            onClick={resetTime}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            title="Reset to now"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Speed selector */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu((p) => !p)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors text-xs font-mono"
            >
              <FastForward className="w-3 h-3" />
              {speed}×
            </button>

            <AnimatePresence>
              {showSpeedMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 glass p-1 min-w-[70px] z-20"
                >
                  {SPEED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        onSpeedChange(opt.value);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                        speed === opt.value ?
                          "bg-accent-primary/20 text-accent-primary"
                        : "text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TimeControls;
