import { Suspense, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Info,
  Maximize2,
  Minimize2,
  List,
  X,
  SatelliteDish,
  Globe,
  Radio,
  AlertTriangle,
  Tag,
  Spline,
  Search,
  Crosshair,
  Moon as MoonIcon,
} from "lucide-react";
import useAsteroidStore from "../stores/asteroidStore";
import Earth3D from "../components/Visualization/Earth3D";
import { RISK_COLORS } from "../utils/riskColors";
import TimeControls from "../components/Visualization/TimeControls";
import AsteroidInfoPanel from "../components/Visualization/AsteroidInfoPanel";
import useMediaQuery from "../hooks/useMediaQuery";
import socketService from "../services/socket";
import {
  makeTrajectory,
  kmToLD,
  formatRelative,
  flybyPhase,
  PHASE_LABEL,
  LUNAR_DISTANCE_KM,
} from "../utils/ephemeris";

const HOUR = 3600000;
const MAX_HOURS = 168;

const FILTERS = [
  ["all", "All"],
  ["hazardous", "Hazardous"],
  ["approaching", "Approaching"],
  ["passed", "Passed"],
];

const Legend = ({ onClose }) => (
  <div className="glass p-4 pointer-events-auto text-sm text-white/70 space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="font-bold text-white flex items-center gap-2">
        <SatelliteDish className="w-4 h-4 text-accent-primary" /> Live Orbital View
      </h3>
      {onClose && (
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/40" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
    <p className="text-xs leading-relaxed">
      Earth, the Moon and the Sun are placed at their real positions for the
      selected time. Each asteroid follows its trajectory propagated from
      NASA/JPL orbital elements — the line shows ±6 days around its closest
      approach; the dot marks the closest point.
    </p>
    <div className="grid grid-cols-2 gap-1.5 text-xs">
      {[
        ["high", "High risk"],
        ["moderate", "Moderate"],
        ["low", "Low"],
        ["minimal", "Minimal"],
      ].map(([k, label]) => (
        <span key={k} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[k] }} />
          {label}
        </span>
      ))}
    </div>
    <p className="text-[11px] text-white/40 border-t border-white/10 pt-2">
      Distances use a logarithmic scale (directions are true). Rings mark
      geostationary orbit, the Moon (1 LD = 384,400 km), 10, 50 and 200 LD.
      Drag to rotate · scroll to zoom · click an asteroid for live details.
    </p>
  </div>
);

const Visualization = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { flybys, flybysLoaded, fetchFlybys } = useAsteroidStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [showList, setShowList] = useState(true);
  // Hazard labels start hidden on phones to keep the small view readable
  const [showLabels, setShowLabels] = useState(() => window.innerWidth > 640);
  const [showPaths, setShowPaths] = useState(true);
  const [selectedId, setSelectedId] = useState(() => searchParams.get("focus"));
  const [hoveredAsteroid, setHoveredAsteroid] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const [timeOffset, setTimeOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const animFrameRef = useRef(null);
  const lastTickRef = useRef(0);
  const isCompact = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  // ─── Data ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFlybys(7);
    const refresh = () => fetchFlybys(7);
    socketService.on("ORBITS_UPDATED", refresh);
    return () => socketService.off("ORBITS_UPDATED");
  }, [fetchFlybys]);

  // Selection is stored by id (deep link ?focus=<id>) and resolved against the
  // latest data, so it survives refreshes
  const selectedAsteroid = useMemo(
    () => flybys.find((a) => a.neo_reference_id === selectedId) || null,
    [flybys, selectedId],
  );

  // ─── Playback ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return undefined;
    const tick = () => {
      const now = Date.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setTimeOffset((prev) => {
        const next = prev + dt * playSpeed;
        if (next >= MAX_HOURS || next <= -MAX_HOURS) {
          setIsPlaying(false);
          return Math.max(-MAX_HOURS, Math.min(MAX_HOURS, next));
        }
        return next;
      });
      animFrameRef.current = requestAnimationFrame(tick);
    };
    lastTickRef.current = Date.now();
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, playSpeed]);

  // ─── Live list (distance at the current sim time, refreshed every 2 s) ─
  const trajectories = useMemo(() => {
    const m = new Map();
    flybys.forEach((a) => m.set(a.neo_reference_id, makeTrajectory(a)));
    return m;
  }, [flybys]);

  const [listClock, setListClock] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setListClock(Date.now()), 2000);
    return () => clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    const t = listClock + timeOffset * HOUR;
    return flybys.map((a) => {
      const traj = trajectories.get(a.neo_reference_id);
      const dist = Math.hypot(...traj.at(t));
      const tca = new Date(a.closeApproachDate).getTime();
      return {
        asteroid: a,
        distKm: dist,
        phase: flybyPhase(tca - t),
        untilCa: tca - t,
      };
    });
  }, [flybys, trajectories, listClock, timeOffset]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter(({ asteroid, phase, untilCa }) => {
        if (q && !asteroid.name.toLowerCase().includes(q)) return false;
        if (filter === "hazardous" && !asteroid.isPotentiallyHazardous) return false;
        if (filter === "approaching" && phase !== "approaching") return false;
        if (filter === "passed" && untilCa > 0) return false;
        return true;
      })
      .sort((a, b) => a.distKm - b.distKm);
  }, [rows, query, filter]);

  // The 3D scene shows what the list shows (hazard / phase / search filters)
  const sceneAsteroids = useMemo(() => visibleRows.map((r) => r.asteroid), [visibleRows]);

  const closestNow = visibleRows[0];
  const insideMoon = rows.filter((r) => r.distKm < LUNAR_DISTANCE_KM).length;
  const hazardousCount = flybys.filter((a) => a.isPotentiallyHazardous).length;

  // ─── Handlers ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleSelect = useCallback((a) => {
    setSelectedId(a?.neo_reference_id ?? null);
    setShowInfo(false);
  }, []);
  const handleDeselect = useCallback(() => setSelectedId(null), []);
  const handleJumpTo = useCallback((hours) => {
    setIsPlaying(false);
    setTimeOffset(Math.max(-MAX_HOURS, Math.min(MAX_HOURS, hours)));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setSelectedId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isCompact) {
      setShowInfo(false);
      setShowList(false);
    }
  }, [isCompact]);

  const toolbarBtn = (active) =>
    `p-2.5 glass transition-colors ${active ? "bg-accent-primary/20 border-accent-primary/40" : "hover:bg-white/10"}`;

  const listPanel = (
    <div className="glass p-4 flex flex-col pointer-events-auto min-h-0 max-h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white">
          Objects in view <span className="text-white/40">({visibleRows.length})</span>
        </h4>
        <button onClick={() => setShowList(false)} className="p-1 rounded hover:bg-white/10 text-white/40" aria-label="Close list">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find asteroid…"
          className="w-full bg-space-800/80 border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent-primary/50"
        />
      </div>
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-2 py-1 rounded-md text-[11px] whitespace-nowrap ${filter === k ? "bg-accent-primary text-space-900 font-semibold" : "bg-white/5 text-white/60 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-1 overflow-y-auto flex-1 pr-1 min-h-0">
        {!flybysLoaded && <p className="text-xs text-white/40 p-2">Loading trajectories…</p>}
        {flybysLoaded && visibleRows.length === 0 && (
          <p className="text-xs text-white/40 p-2">No objects match.</p>
        )}
        {visibleRows.map(({ asteroid, distKm, phase, untilCa }) => {
          const isSel = selectedAsteroid?.neo_reference_id === asteroid.neo_reference_id;
          return (
            <button
              key={asteroid.neo_reference_id}
              onClick={() => handleSelect(asteroid)}
              onMouseEnter={() => setHoveredAsteroid(asteroid)}
              onMouseLeave={() => setHoveredAsteroid(null)}
              className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 border transition-colors ${isSel ? "bg-accent-primary/15 border-accent-primary/30" : "border-transparent hover:bg-white/5"}`}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[asteroid.riskCategory] }} />
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-white/85 truncate">
                  {asteroid.name.replace(/[()]/g, "").trim()}
                  {asteroid.isPotentiallyHazardous && <span className="ml-1 text-[10px] text-rose-400 font-semibold">PHA</span>}
                </span>
                <span className="block text-[10px] text-white/40">
                  CA {formatRelative(untilCa)} · {PHASE_LABEL[phase].toLowerCase()}
                </span>
              </span>
              <span className="text-xs font-mono text-white/70">{kmToLD(distKm).toFixed(1)} LD</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isFullscreen ? "pt-0" : "pt-[72px]"} relative bg-black`}>
      <div className={isFullscreen ? "fixed inset-0 z-50" : "relative h-[calc(100vh-72px)]"}>
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-14 h-14 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/50">Computing ephemerides…</p>
              </div>
            </div>
          }
        >
          <Earth3D
            asteroids={sceneAsteroids}
            className="w-full h-full"
            timeOffset={timeOffset}
            selectedAsteroid={selectedAsteroid}
            hoveredAsteroid={hoveredAsteroid}
            onSelectAsteroid={handleSelect}
            onHoverAsteroid={setHoveredAsteroid}
            onDeselectAsteroid={handleDeselect}
            showLabels={showLabels}
            showPaths={showPaths}
          />
        </Suspense>

        {/* Toolbar */}
        <div className="absolute top-4 right-4 flex gap-2 z-30">
          <AnimatePresence>
            {selectedAsteroid && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={handleDeselect}
                className="px-3 py-2 glass bg-accent-primary/20 border border-accent-primary/40 flex items-center gap-2 text-sm text-white"
                title="Return to Earth view (Esc)"
              >
                <Globe className="w-4 h-4 text-accent-primary" /> Earth view
              </motion.button>
            )}
          </AnimatePresence>
          <button onClick={() => setShowLabels((v) => !v)} className={toolbarBtn(showLabels)} title="Toggle labels" aria-pressed={showLabels}>
            <Tag className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => setShowPaths((v) => !v)} className={toolbarBtn(showPaths)} title="Toggle trajectories" aria-pressed={showPaths}>
            <Spline className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => setShowInfo((v) => !v)} className={toolbarBtn(showInfo)} title="About this view" aria-pressed={showInfo}>
            <Info className="w-4 h-4 text-white" />
          </button>
          <button onClick={() => setShowList((v) => !v)} className={toolbarBtn(showList)} title="Object list" aria-pressed={showList}>
            <List className="w-4 h-4 text-white" />
          </button>
          {!isMobile && (
            <button onClick={toggleFullscreen} className={toolbarBtn(false)} title="Fullscreen">
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-white" />}
            </button>
          )}
        </div>

        {/* Left column: legend + list (desktop) */}
        {!isCompact && (
          <div className="absolute top-4 left-4 bottom-40 w-80 flex flex-col gap-3 z-20 pointer-events-none">
            {showInfo && <Legend onClose={() => setShowInfo(false)} />}
            {showList && listPanel}
          </div>
        )}

        {/* Compact: legend modal + list bottom sheet */}
        {isCompact && (
          <AnimatePresence>
            {showInfo && (
              <motion.div
                key="legend"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-space-900/70 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setShowInfo(false)}
              >
                <div className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                  <Legend onClose={() => setShowInfo(false)} />
                </div>
              </motion.div>
            )}
            {showList && (
              <motion.div
                key="list"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                className="fixed inset-x-0 bottom-0 z-40 h-[65vh] flex flex-col p-2"
              >
                {listPanel}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <AsteroidInfoPanel
          asteroid={selectedAsteroid}
          timeOffset={timeOffset}
          onClose={handleDeselect}
          onNavigate={(id) => navigate(`/asteroid/${id}`)}
          onJumpTo={handleJumpTo}
        />

        {/* Bottom: live stats + time controls */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          {!isMobile && (
            <div className="flex flex-wrap gap-2 px-4 pb-2 pointer-events-auto">
              <div className="glass px-3 py-1.5 flex items-center gap-2 text-sm">
                <Radio className="w-4 h-4 text-accent-primary" />
                <span className="text-white font-medium">{flybys.length}</span>
                <span className="text-white/40 text-xs">flybys ±7 days</span>
              </div>
              {hazardousCount > 0 && (
                <div className="glass px-3 py-1.5 flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-white font-medium">{hazardousCount}</span>
                  <span className="text-white/40 text-xs">potentially hazardous</span>
                </div>
              )}
              {closestNow && (
                <button
                  onClick={() => handleSelect(closestNow.asteroid)}
                  className="glass px-3 py-1.5 flex items-center gap-2 text-sm hover:bg-white/10"
                >
                  <Crosshair className="w-4 h-4 text-amber-300" />
                  <span className="text-white/40 text-xs">Closest {timeOffset === 0 ? "now" : "then"}:</span>
                  <span className="text-white font-medium">
                    {closestNow.asteroid.name.replace(/[()]/g, "").trim()} · {kmToLD(closestNow.distKm).toFixed(1)} LD
                  </span>
                </button>
              )}
              <div className="glass px-3 py-1.5 flex items-center gap-2 text-sm">
                <MoonIcon className="w-4 h-4 text-slate-300" />
                <span className="text-white font-medium">{insideMoon}</span>
                <span className="text-white/40 text-xs">inside the Moon's orbit</span>
              </div>
            </div>
          )}
          <div className="pointer-events-auto">
            <TimeControls
              timeOffset={timeOffset}
              onTimeChange={setTimeOffset}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              speed={playSpeed}
              onSpeedChange={setPlaySpeed}
              maxHours={MAX_HOURS}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualization;
