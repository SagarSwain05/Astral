import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Info,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Move3D,
  List,
  X,
  ChevronDown,
  ChevronUp,
  SatelliteDish,
  Globe,
  Radio,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import useAsteroidStore from "../stores/asteroidStore";
import Earth3D from "../components/Visualization/Earth3D";
import TimeControls from "../components/Visualization/TimeControls";
import AsteroidInfoPanel from "../components/Visualization/AsteroidInfoPanel";
import SunClock from "../components/Visualization/SunClock";
import useMediaQuery from "../hooks/useMediaQuery";

const Visualization = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    todayAsteroids,
    fetchTodayAsteroids,
    fetchAsteroidById,
    selectedAsteroid: storeSelected,
  } = useAsteroidStore();

  // ─── State ───────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const [showAsteroidList, setShowAsteroidList] = useState(false);
  const [selectedAsteroid, setSelectedAsteroid] = useState(null);
  const [hoveredAsteroid, setHoveredAsteroid] = useState(null);

  // Sun clock
  const [sunHourAngle, setSunHourAngle] = useState(() => {
    const now = new Date();
    return now.getUTCHours() + now.getUTCMinutes() / 60;
  });

  // Time controls
  const [timeOffset, setTimeOffset] = useState(0); // hours from now
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const animFrameRef = useRef(null);
  const lastTickRef = useRef(Date.now());
  const isCompact = useMediaQuery("(max-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 640px)");

  // ─── Load data ───────────────────────────────────────────────────
  useEffect(() => {
    fetchTodayAsteroids();
  }, []);

  // Deep-link: ?focus=<neo_reference_id>
  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId && todayAsteroids.length > 0) {
      const found = todayAsteroids.find((a) => a.neo_reference_id === focusId);
      if (found) {
        setSelectedAsteroid(found);
      }
    }
  }, [searchParams, todayAsteroids]);

  // ─── Playback loop ───────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const tick = () => {
      const now = Date.now();
      const dt = (now - lastTickRef.current) / 1000; // seconds elapsed
      lastTickRef.current = now;
      // Advance time: 1 real second = playSpeed * 1 hour of sim time
      setTimeOffset((prev) => {
        const next = prev + dt * playSpeed;
        if (next >= 168) {
          setIsPlaying(false);
          return 168;
        }
        if (next <= -168) {
          setIsPlaying(false);
          return -168;
        }
        return next;
      });
      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = Date.now();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, playSpeed]);

  // ─── Handlers ────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen((prev) => !prev);
  }, [isFullscreen]);

  const handleSelectAsteroid = useCallback((asteroid) => {
    console.log("handleSelectAsteroid called with:", asteroid?.name || "null");
    setSelectedAsteroid(asteroid);
  }, []);

  const handleDeselectAsteroid = useCallback(() => {
    console.log("handleDeselectAsteroid called");
    setSelectedAsteroid(null);
  }, []);

  // Keyboard shortcut: Escape to deselect and return to Earth
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedAsteroid) {
        handleDeselectAsteroid();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedAsteroid, handleDeselectAsteroid]);

  // Auto-close info panel on compact screens — user can toggle it back
  useEffect(() => {
    if (isCompact) setShowInfo(false);
  }, [isCompact]);

  const handleNavigateToDetail = useCallback(
    (id) => {
      navigate(`/asteroids/${id}`);
    },
    [navigate],
  );

  // ─── Derived values ──────────────────────────────────────────────
  const hazardousCount = todayAsteroids.filter(
    (a) => a.isPotentiallyHazardous,
  ).length;
  const highRiskCount = todayAsteroids.filter(
    (a) => a.riskCategory === "high",
  ).length;
  const toolbarClasses = "absolute top-4 right-4 flex gap-2 z-10";
  const toolbarButtonClasses = "p-3 glass hover:bg-white/10 transition-colors";

  return (
    <div
      className={`min-h-screen ${
        isFullscreen ? "pt-0"
        : isCompact ? "pt-24"
        : "pt-20"
      } pb-0 relative`}
    >
      <div
        className={`${
          isFullscreen ? "fixed inset-0 z-50"
          : isCompact ? "relative h-[calc(100vh-96px)]"
          : "relative h-[calc(100vh-80px)]"
        }`}
      >
        {/* 3D Canvas */}
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-space-900">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/50">
                  Initializing 3D visualization...
                </p>
                <p className="text-white/30 text-sm mt-2">
                  Loading orbital data & shaders
                </p>
              </div>
            </div>
          }
        >
          <Earth3D
            asteroids={todayAsteroids}
            className="w-full h-full"
            timeOffset={timeOffset}
            selectedAsteroid={selectedAsteroid}
            hoveredAsteroid={hoveredAsteroid}
            onSelectAsteroid={handleSelectAsteroid}
            onHoverAsteroid={setHoveredAsteroid}
            onDeselectAsteroid={handleDeselectAsteroid}
            sunHourAngle={sunHourAngle}
          />
        </Suspense>

        {/* ─── Top-right toolbar ─────────────────────────── */}
        <div className={toolbarClasses}>
          {/* Back to Earth button - shows when asteroid is selected */}
          <AnimatePresence>
            {selectedAsteroid && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                onClick={handleDeselectAsteroid}
                className="px-4 py-2 glass bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/40 transition-colors flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Return to Earth view (Esc)"
              >
                <Globe className="w-4 h-4 text-accent-primary" />
                <span className="text-sm font-medium text-white">
                  Back to Earth
                </span>
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => setShowInfo((prev) => !prev)}
            className={toolbarButtonClasses}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Toggle info panel"
          >
            <Info className="w-5 h-5 text-white" />
          </motion.button>

          <motion.button
            onClick={() => setShowAsteroidList((prev) => !prev)}
            className={toolbarButtonClasses}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Asteroid list"
          >
            <List className="w-5 h-5 text-white" />
          </motion.button>

          <motion.button
            onClick={toggleFullscreen}
            className={toolbarButtonClasses}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isFullscreen ?
              <Minimize2 className="w-5 h-5 text-white" />
            : <Maximize2 className="w-5 h-5 text-white" />}
          </motion.button>
        </div>

        {/* ─── Info + Asteroid List Panels ───────────────────── */}
        {isCompact ?
          <>
            <AnimatePresence>
              {showInfo && !selectedAsteroid && (
                <motion.div
                  key="info-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-space-900/70 backdrop-blur-sm z-[15]"
                  onClick={() => setShowInfo(false)}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showInfo && !selectedAsteroid && (
                <motion.div
                  key="info-panel"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass p-5 z-20 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-sm rounded-3xl shadow-2xl"
                >
                  <button
                    onClick={() => setShowInfo(false)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <SatelliteDish className="w-5 h-5 text-accent-primary" />
                    Orbital Viewer
                  </h3>
                  <div className="space-y-3 text-sm text-white/70">
                    <p>
                      Interactive 3D visualization of near-Earth asteroid
                      orbits. Use the time slider to project positions up to 7
                      days out.
                    </p>
                    <div className="space-y-2">
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-risk-high inline-block" />
                        High Risk
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-risk-moderate inline-block" />
                        Moderate
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-risk-low inline-block" />
                        Low Risk
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-risk-minimal inline-block" />
                        Minimal
                      </p>
                    </div>
                    <div className="border-t border-white/10 pt-2 space-y-1 text-white/40 text-xs">
                      <p className="flex items-center gap-1.5">
                        <MousePointerClick className="w-3.5 h-3.5" />
                        Click asteroid to inspect
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Move3D className="w-3.5 h-3.5" />
                        Drag to rotate • Scroll to zoom
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showAsteroidList && (
                <motion.div
                  key="list-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-space-900/90 backdrop-blur-sm z-10"
                  onClick={() => setShowAsteroidList(false)}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showAsteroidList && (
                <motion.div
                  key="list-panel"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  className="glass p-4 overflow-hidden flex flex-col fixed inset-x-0 bottom-0 z-20 rounded-t-3xl max-h-[70vh]"
                >
                  <div className="flex justify-center pb-2">
                    <span className="h-1.5 w-12 rounded-full bg-white/15" />
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">
                      Tracked Objects ({todayAsteroids.length})
                    </h4>
                    <button
                      onClick={() => setShowAsteroidList(false)}
                      className="p-1 rounded hover:bg-white/10 text-white/40"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
                    {todayAsteroids.map((asteroid) => {
                      const isSelected =
                        selectedAsteroid?.neo_reference_id ===
                        asteroid.neo_reference_id;
                      const riskColors = {
                        high: "bg-risk-high",
                        moderate: "bg-risk-moderate",
                        low: "bg-risk-low",
                        minimal: "bg-risk-minimal",
                      };

                      return (
                        <button
                          key={asteroid.neo_reference_id}
                          onClick={() => handleSelectAsteroid(asteroid)}
                          onMouseEnter={() => setHoveredAsteroid(asteroid)}
                          onMouseLeave={() => setHoveredAsteroid(null)}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all text-sm ${
                            isSelected ?
                              "bg-accent-primary/15 border border-accent-primary/30"
                            : "hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${riskColors[asteroid.riskCategory] || "bg-risk-minimal"}`}
                          />
                          <span className="truncate text-white/80 flex-1">
                            {asteroid.name?.replace(/[()]/g, "").trim()}
                          </span>
                          {asteroid.isPotentiallyHazardous && (
                            <span className="text-[10px] text-risk-high font-medium">
                              PHA
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        : <div className="absolute top-4 left-4 flex flex-col gap-4 z-20 pointer-events-none w-72">
            <AnimatePresence>
              {showInfo && !selectedAsteroid && (
                <motion.div
                  key="info-panel-desktop"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass p-5 pointer-events-auto"
                >
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <SatelliteDish className="w-5 h-5 text-accent-primary" />
                    Orbital Viewer
                  </h3>
                  <div className="space-y-3 text-sm text-white/70">
                    <p>
                      Interactive 3D visualization of near-Earth asteroid
                      orbits. Use the time slider to project positions up to 7
                      days out.
                    </p>
                    <div className="space-y-2">
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-risk-high inline-block" />
                        High Risk
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-risk-moderate inline-block" />
                        Moderate
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-risk-low inline-block" />
                        Low Risk
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-risk-minimal inline-block" />
                        Minimal
                      </p>
                    </div>
                    <div className="border-t border-white/10 pt-2 space-y-1 text-white/40 text-xs">
                      <p className="flex items-center gap-1.5">
                        <MousePointerClick className="w-3.5 h-3.5" />
                        Click asteroid to inspect
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Move3D className="w-3.5 h-3.5" />
                        Drag to rotate • Scroll to zoom
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showAsteroidList && (
                <motion.div
                  key="list-panel-desktop"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass p-4 overflow-hidden flex flex-col pointer-events-auto max-h-[60vh]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">
                      Tracked Objects ({todayAsteroids.length})
                    </h4>
                    <button
                      onClick={() => setShowAsteroidList(false)}
                      className="p-1 rounded hover:bg-white/10 text-white/40"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 pr-1">
                    {todayAsteroids.map((asteroid) => {
                      const isSelected =
                        selectedAsteroid?.neo_reference_id ===
                        asteroid.neo_reference_id;
                      const riskColors = {
                        high: "bg-risk-high",
                        moderate: "bg-risk-moderate",
                        low: "bg-risk-low",
                        minimal: "bg-risk-minimal",
                      };

                      return (
                        <button
                          key={asteroid.neo_reference_id}
                          onClick={() => handleSelectAsteroid(asteroid)}
                          onMouseEnter={() => setHoveredAsteroid(asteroid)}
                          onMouseLeave={() => setHoveredAsteroid(null)}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all text-sm ${
                            isSelected ?
                              "bg-accent-primary/15 border border-accent-primary/30"
                            : "hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${riskColors[asteroid.riskCategory] || "bg-risk-minimal"}`}
                          />
                          <span className="truncate text-white/80 flex-1">
                            {asteroid.name?.replace(/[()]/g, "").trim()}
                          </span>
                          {asteroid.isPotentiallyHazardous && (
                            <span className="text-[10px] text-risk-high font-medium">
                              PHA
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }

        {/* ─── Selected Asteroid Info Panel (right) ──────── */}
        <AsteroidInfoPanel
          asteroid={selectedAsteroid}
          onClose={handleDeselectAsteroid}
          onNavigate={handleNavigateToDetail}
        />

        {/* ─── Sun Clock (desktop only) ─────────────────── */}
        {!isCompact && (
          <div className="absolute bottom-44 right-4 z-10">
            <SunClock
              sunHour={sunHourAngle}
              onSunHourChange={setSunHourAngle}
              size={130}
            />
          </div>
        )}

        {/* Desktop panels rendered above; mobile list handled in compact branch */}

        {/* ─── Bottom panel: stats + time controls ──────── */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          {/* Stats badges — hidden on mobile for more canvas space */}
          {!isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 px-4 pb-2 pointer-events-auto justify-start"
            >
              <div className="glass px-3 py-1.5 flex items-center gap-2">
                <Radio className="w-4 h-4 text-accent-primary" />
                <span className="text-white font-medium text-sm">
                  {todayAsteroids.length}
                </span>
                <span className="text-white/40 text-xs">Tracked</span>
              </div>
              {hazardousCount > 0 && (
                <div className="glass px-3 py-1.5 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-risk-high" />
                  <span className="text-white font-medium text-sm">
                    {hazardousCount}
                  </span>
                  <span className="text-white/40 text-xs">Hazardous</span>
                </div>
              )}
              {highRiskCount > 0 && (
                <div className="glass px-3 py-1.5 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-risk-high" />
                  <span className="text-white font-medium text-sm">
                    {highRiskCount}
                  </span>
                  <span className="text-white/40 text-xs">High Risk</span>
                </div>
              )}
            </motion.div>
          )}

          {/* Time Controls */}
          <div className="pointer-events-auto">
            <TimeControls
              timeOffset={timeOffset}
              onTimeChange={setTimeOffset}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying((prev) => !prev)}
              speed={playSpeed}
              onSpeedChange={setPlaySpeed}
              maxHours={168}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualization;
