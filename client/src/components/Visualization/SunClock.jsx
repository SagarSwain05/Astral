import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Clock, RotateCcw } from "lucide-react";

/**
 * 24-hour sun clock that controls Earth day/night illumination.
 * Displays an analog clock face with a draggable sun indicator.
 * Returns sunHourAngle (0–24 UTC) to parent.
 */
const SunClock = ({ sunHour, onSunHourChange, className = "", size = 140 }) => {
  const clockRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLive, setIsLive] = useState(true);

  // Live clock: update every minute
  useEffect(() => {
    if (!isLive) return;
    const update = () => {
      const now = new Date();
      const h =
        now.getUTCHours() +
        now.getUTCMinutes() / 60 +
        now.getUTCSeconds() / 3600;
      onSunHourChange(h);
    };
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [isLive, onSunHourChange]);

  // Convert hour (0-24) to angle in radians (0 = top/12 o'clock)
  const hourToAngle = (h) => ((h % 24) / 24) * Math.PI * 2 - Math.PI / 2;
  const angle = hourToAngle(sunHour);

  // Pointer -> hour calculation
  const pointerToHour = useCallback(
    (clientX, clientY) => {
      if (!clockRef.current) return sunHour;
      const rect = clockRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let a = Math.atan2(clientY - cy, clientX - cx) + Math.PI / 2;
      if (a < 0) a += Math.PI * 2;
      return (a / (Math.PI * 2)) * 24;
    },
    [sunHour],
  );

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(true);
      setIsLive(false);
      const h = pointerToHour(e.clientX, e.clientY);
      onSunHourChange(h);
    },
    [pointerToHour, onSunHourChange],
  );

  useEffect(() => {
    if (!isDragging) return;
    const move = (e) => {
      const h = pointerToHour(e.clientX, e.clientY);
      onSunHourChange(h);
    };
    const up = () => setIsDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [isDragging, pointerToHour, onSunHourChange]);

  const resetToLive = useCallback(() => {
    setIsLive(true);
  }, []);

  // Sun indicator position on the clock
  const R = 40; // radius percentage for the hand tip
  const sunX = 50 + Math.cos(angle) * R;
  const sunY = 50 + Math.sin(angle) * R;

  // Is it "day" (6–18) or "night"?
  const isDay = sunHour >= 6 && sunHour < 18;

  // Format the hour
  const formatHour = (h) => {
    const hr = Math.floor(h % 24);
    const min = Math.floor((h % 1) * 60);
    return `${hr.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  };

  // Hour markers
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
      const isMajor = i % 6 === 0;
      const outerR = 46;
      const innerR = isMajor ? 40 : 42;
      const labelR = 34;
      markers.push({
        key: i,
        x1: 50 + Math.cos(a) * innerR,
        y1: 50 + Math.sin(a) * innerR,
        x2: 50 + Math.cos(a) * outerR,
        y2: 50 + Math.sin(a) * outerR,
        isMajor,
        label: isMajor ? i.toString().padStart(2, "0") : null,
        lx: 50 + Math.cos(a) * labelR,
        ly: 50 + Math.sin(a) * labelR,
      });
    }
    return markers;
  }, []);

  // Day/night arc for visual reference
  const dayArcPath = useMemo(() => {
    // Day arc from 6h to 18h
    const startA = (6 / 24) * Math.PI * 2 - Math.PI / 2;
    const endA = (18 / 24) * Math.PI * 2 - Math.PI / 2;
    const r = 47.5;
    const sx = 50 + Math.cos(startA) * r;
    const sy = 50 + Math.sin(startA) * r;
    const ex = 50 + Math.cos(endA) * r;
    const ey = 50 + Math.sin(endA) * r;
    return `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`;
  }, []);

  const nightArcPath = useMemo(() => {
    const startA = (18 / 24) * Math.PI * 2 - Math.PI / 2;
    const endA = (6 / 24) * Math.PI * 2 - Math.PI / 2;
    const r = 47.5;
    const sx = 50 + Math.cos(startA) * r;
    const sy = 50 + Math.sin(startA) * r;
    const ex = 50 + Math.cos(endA) * r;
    const ey = 50 + Math.sin(endA) * r;
    return `M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass p-3 select-none ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          {isDay ?
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
          : <Moon className="w-3.5 h-3.5 text-blue-300" />}
          <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
            Sun Position
          </span>
        </div>
        {!isLive && (
          <button
            onClick={resetToLive}
            className="flex items-center gap-1 text-[10px] text-accent-primary hover:text-accent-primary/80 transition-colors"
            title="Reset to live"
          >
            <RotateCcw className="w-3 h-3" />
            Live
          </button>
        )}
      </div>

      {/* Clock face */}
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg
          ref={clockRef}
          viewBox="0 0 100 100"
          className="w-full h-full cursor-pointer"
          onPointerDown={handlePointerDown}
        >
          {/* Background */}
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="rgba(0,0,0,0.3)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
          />

          {/* Day arc (warm) */}
          <path
            d={dayArcPath}
            fill="none"
            stroke="rgba(255,200,50,0.2)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Night arc (cool) */}
          <path
            d={nightArcPath}
            fill="none"
            stroke="rgba(80,120,200,0.15)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Hour ticks */}
          {hourMarkers.map((m) => (
            <g key={m.key}>
              <line
                x1={m.x1}
                y1={m.y1}
                x2={m.x2}
                y2={m.y2}
                stroke={
                  m.isMajor ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"
                }
                strokeWidth={m.isMajor ? 0.8 : 0.4}
              />
              {m.label && (
                <text
                  x={m.lx}
                  y={m.ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="rgba(255,255,255,0.35)"
                  fontSize="4"
                  fontFamily="monospace"
                >
                  {m.label}
                </text>
              )}
            </g>
          ))}

          {/* Clock hand */}
          <line
            x1="50"
            y1="50"
            x2={sunX}
            y2={sunY}
            stroke={isDay ? "rgba(255,200,50,0.6)" : "rgba(100,150,255,0.4)"}
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle cx="50" cy="50" r="2" fill="rgba(255,255,255,0.3)" />

          {/* Sun/Moon indicator at hand tip */}
          <circle
            cx={sunX}
            cy={sunY}
            r="4"
            fill={isDay ? "rgba(255,200,50,0.9)" : "rgba(100,150,255,0.7)"}
            style={{
              filter: `drop-shadow(0 0 ${isDay ? "3px rgba(255,200,50,0.6)" : "2px rgba(100,150,255,0.4)"})`,
            }}
          />
          <circle
            cx={sunX}
            cy={sunY}
            r="2"
            fill={isDay ? "#fff8e0" : "#c8d8ff"}
          />

          {/* Center text: current time */}
          <text
            x="50"
            y="62"
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.7)"
            fontSize="5.5"
            fontFamily="monospace"
            fontWeight="bold"
          >
            {formatHour(sunHour)}
          </text>
          <text
            x="50"
            y="67"
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.3)"
            fontSize="3"
            fontFamily="monospace"
          >
            UTC
          </text>
        </svg>

        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-1 right-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[8px] text-green-400/70 font-medium">
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <p className="text-[9px] text-white/25 text-center mt-1.5">
        Drag to change sun position
      </p>
    </motion.div>
  );
};

export default SunClock;
