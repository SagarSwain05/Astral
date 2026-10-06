import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import {
  Rocket,
  RotateCcw,
  Gauge,
  Ruler,
  Crosshair,
  Flame,
  Zap,
  Mountain,
  Activity,
  Wind,
  ChevronDown,
  ChevronUp,
  Info,
  Globe,
  Maximize2,
  Minimize2,
  Target,
} from "lucide-react";
import * as THREE from "three";
import ImpactSimulator, {
  estimateImpact,
} from "../components/Visualization/ImpactSimulator";

// ─── Preset asteroids ────────────────────────────────────────────────
const PRESETS = [
  {
    name: "Small Meteorite",
    diameterKm: 0.01,
    velocityKmS: 15,
    densityKgM3: 3500,
    angleDegs: 45,
    desc: "House-sized rock — burns up mostly in atmosphere",
  },
  {
    name: "Chelyabinsk-type",
    diameterKm: 0.02,
    velocityKmS: 19,
    densityKgM3: 3600,
    angleDegs: 18,
    desc: "Like the 2013 Russian airburst event",
  },
  {
    name: "Tunguska-type",
    diameterKm: 0.06,
    velocityKmS: 15,
    densityKgM3: 2500,
    angleDegs: 30,
    desc: "Flattened 2,000 km² of Siberian forest in 1908",
  },
  {
    name: "City Killer",
    diameterKm: 0.15,
    velocityKmS: 20,
    densityKgM3: 3000,
    angleDegs: 45,
    desc: "Would devastate a metropolitan area",
  },
  {
    name: "Apophis-sized",
    diameterKm: 0.37,
    velocityKmS: 12.6,
    densityKgM3: 2600,
    angleDegs: 45,
    desc: "370m — like asteroid 99942 Apophis",
  },
  {
    name: "Chicxulub Impactor",
    diameterKm: 10,
    velocityKmS: 20,
    densityKgM3: 2600,
    angleDegs: 60,
    desc: "The dinosaur killer — 66 million years ago",
  },
];

// ─── Impact location presets ─────────────────────────────────────────
const LOCATIONS = [
  { name: "Atlantic Ocean", lat: 30, lng: -40 },
  { name: "Pacific Ocean", lat: -10, lng: -160 },
  { name: "Sahara Desert", lat: 23, lng: 10 },
  { name: "Siberia", lat: 62, lng: 100 },
  { name: "Amazon Rainforest", lat: -3, lng: -60 },
  { name: "Antarctica", lat: -80, lng: 0 },
  { name: "Random", lat: null, lng: null },
];

function latLngToVector3(lat, lng, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

const ImpactVisualizer = () => {
  const [searchParams] = useSearchParams();
  const animRef = useRef(null);

  // ─── Parameters ───────────────────────────────────────────────
  const [diameterKm, setDiameterKm] = useState(0.15);
  const [velocityKmS, setVelocityKmS] = useState(20);
  const [densityKgM3, setDensityKgM3] = useState(3000);
  const [angleDegs, setAngleDegs] = useState(45);
  const [impactLat, setImpactLat] = useState(30);
  const [impactLng, setImpactLng] = useState(-40);

  // ─── Simulation state ─────────────────────────────────────────
  const [phase, setPhase] = useState("idle"); // idle | approaching | impact | aftermath
  const [progress, setProgress] = useState(0);
  const [showPanel, setShowPanel] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [impactResults, setImpactResults] = useState(null);

  // Load from search params if navigated from asteroid detail
  useEffect(() => {
    const d = searchParams.get("diameter");
    const v = searchParams.get("velocity");
    if (d) setDiameterKm(parseFloat(d));
    if (v) setVelocityKmS(parseFloat(v));
  }, [searchParams]);

  // ─── Computed 3D values ────────────────────────────────────────
  const impactPoint = useMemo(
    () => latLngToVector3(impactLat, impactLng),
    [impactLat, impactLng],
  );

  const asteroidStartPos = useMemo(() => {
    const dir = impactPoint.clone().normalize();
    const offset = new THREE.Vector3(
      Math.sin((angleDegs * Math.PI) / 180) * 0.5,
      Math.cos((angleDegs * Math.PI) / 180) * 0.3,
      0,
    );
    return dir.clone().multiplyScalar(12).add(offset);
  }, [impactPoint, angleDegs]);

  const [asteroidPos, setAsteroidPos] = useState(() =>
    asteroidStartPos.clone(),
  );

  const explosionIntensity = useMemo(() => {
    return Math.max(0.5, Math.min(3, Math.log10(diameterKm * 1000 + 1) * 0.8));
  }, [diameterKm]);

  const params = useMemo(
    () => ({ diameterKm, velocityKmS, densityKgM3, angleDegs }),
    [diameterKm, velocityKmS, densityKgM3, angleDegs],
  );

  // ─── Apply preset ─────────────────────────────────────────────
  const applyPreset = useCallback((preset, index) => {
    setDiameterKm(preset.diameterKm);
    setVelocityKmS(preset.velocityKmS);
    setDensityKgM3(preset.densityKgM3);
    setAngleDegs(preset.angleDegs);
    setSelectedPreset(index);
    resetSimulation();
  }, []);

  const applyLocation = useCallback((loc) => {
    if (loc.lat === null) {
      setImpactLat(Math.random() * 140 - 70);
      setImpactLng(Math.random() * 360 - 180);
    } else {
      setImpactLat(loc.lat);
      setImpactLng(loc.lng);
    }
    resetSimulation();
  }, []);

  // ─── Launch simulation ─────────────────────────────────────────
  const launchSimulation = useCallback(() => {
    // Compute results
    const results = estimateImpact({
      diameterKm,
      velocityKmS,
      densityKgM3,
      angleDegs,
    });
    setImpactResults(results);
    setPhase("approaching");
    setProgress(0);
    setAsteroidPos(asteroidStartPos.clone());
    setShowStats(false);

    const startTime = Date.now();
    const approachDuration = 3000; // ms
    const impactDuration = 4000;
    const aftermathDuration = 5000;

    const animate = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < approachDuration) {
        // Approach phase
        const t = elapsed / approachDuration;
        setPhase("approaching");
        setProgress(t);
        const pos = new THREE.Vector3().lerpVectors(
          asteroidStartPos,
          impactPoint,
          t,
        );
        setAsteroidPos(pos);
      } else if (elapsed < approachDuration + impactDuration) {
        // Impact phase
        const t = (elapsed - approachDuration) / impactDuration;
        setPhase("impact");
        setProgress(t);
        setAsteroidPos(impactPoint.clone());
      } else if (
        elapsed <
        approachDuration + impactDuration + aftermathDuration
      ) {
        // Aftermath phase
        const t =
          (elapsed - approachDuration - impactDuration) / aftermathDuration;
        setPhase("aftermath");
        setProgress(t);
        if (t > 0.3 && !showStats) {
          setShowStats(true);
        }
      } else {
        // Done
        setPhase("aftermath");
        setProgress(1);
        setShowStats(true);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
  }, [
    diameterKm,
    velocityKmS,
    densityKgM3,
    angleDegs,
    impactPoint,
    asteroidStartPos,
  ]);

  // ─── Reset ─────────────────────────────────────────────────────
  const resetSimulation = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPhase("idle");
    setProgress(0);
    setShowStats(false);
    setImpactResults(null);
    setAsteroidPos(asteroidStartPos.clone());
  }, [asteroidStartPos]);

  // Update asteroid start pos when params change
  useEffect(() => {
    if (phase === "idle") {
      setAsteroidPos(asteroidStartPos.clone());
    }
  }, [asteroidStartPos, phase]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const toggleFullscreen = useCallback(() => setIsFullscreen((f) => !f), []);

  // ─── Format helpers ─────────────────────────────────────────────
  const fmt = (n, d = 1) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(d)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(d)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(d)}K`;
    return n.toFixed(d);
  };

  return (
    <motion.div
      className={`${isFullscreen ? "fixed inset-0 z-50" : "pt-20 pb-8 px-3 sm:px-4 min-h-screen"} bg-space-900`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className={`${isFullscreen ? "h-full" : "max-w-[1600px] mx-auto"} flex flex-col h-full`}
      >
        {/* Header */}
        {!isFullscreen && (
          <div className="mb-4">
            <motion.h1
              className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              Impact Simulator
              <span className="text-sm font-normal text-white/40 ml-2 hidden sm:inline">
                — just for fun 🎮
              </span>
            </motion.h1>
            <p className="text-white/50 mt-1 text-sm">
              Visualize hypothetical asteroid impacts on Earth. Adjust
              parameters and hit Launch!
            </p>
          </div>
        )}

        <div
          className={`flex ${isFullscreen ? "h-full" : "flex-1"} gap-4 ${isFullscreen ? "" : "flex-col lg:flex-row"}`}
        >
          {/* ─── Control Panel ──────────────────────────────────────── */}
          <AnimatePresence>
            {showPanel && (
              <motion.div
                className={`${
                  isFullscreen ?
                    "absolute top-4 left-4 z-10 w-80 max-h-[calc(100vh-2rem)]"
                  : "lg:w-80 w-full"
                } overflow-y-auto scrollbar-thin scrollbar-thumb-white/10`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
              >
                <div className="glass rounded-2xl border border-white/5 p-4 space-y-4">
                  {/* Presets */}
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                      <Rocket className="w-4 h-4" />
                      Asteroid Presets
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESETS.map((p, i) => (
                        <button
                          key={p.name}
                          onClick={() => applyPreset(p, i)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                            selectedPreset === i ?
                              "bg-accent-primary text-space-900"
                            : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                          title={p.desc}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Parameter sliders */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Parameters
                    </h3>

                    {/* Diameter */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 flex items-center gap-1">
                          <Ruler className="w-3 h-3" /> Diameter
                        </span>
                        <span className="text-white font-mono">
                          {diameterKm >= 1 ?
                            `${diameterKm.toFixed(1)} km`
                          : `${(diameterKm * 1000).toFixed(0)} m`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-3}
                        max={1.5}
                        step={0.01}
                        value={Math.log10(diameterKm)}
                        onChange={(e) =>
                          setDiameterKm(
                            Math.pow(10, parseFloat(e.target.value)),
                          )
                        }
                        className="w-full accent-orange-500 h-1.5"
                        disabled={phase !== "idle"}
                      />
                      <div className="flex justify-between text-[10px] text-white/30">
                        <span>1m</span>
                        <span>~30km</span>
                      </div>
                    </div>

                    {/* Velocity */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Velocity
                        </span>
                        <span className="text-white font-mono">
                          {velocityKmS.toFixed(1)} km/s
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={72}
                        step={0.5}
                        value={velocityKmS}
                        onChange={(e) =>
                          setVelocityKmS(parseFloat(e.target.value))
                        }
                        className="w-full accent-blue-500 h-1.5"
                        disabled={phase !== "idle"}
                      />
                      <div className="flex justify-between text-[10px] text-white/30">
                        <span>5 km/s</span>
                        <span>72 km/s</span>
                      </div>
                    </div>

                    {/* Density */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 flex items-center gap-1">
                          <Mountain className="w-3 h-3" /> Density
                        </span>
                        <span className="text-white font-mono">
                          {densityKgM3} kg/m³
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1500}
                        max={8000}
                        step={100}
                        value={densityKgM3}
                        onChange={(e) =>
                          setDensityKgM3(parseInt(e.target.value))
                        }
                        className="w-full accent-green-500 h-1.5"
                        disabled={phase !== "idle"}
                      />
                      <div className="flex justify-between text-[10px] text-white/30">
                        <span>Ice/comet</span>
                        <span>Iron</span>
                      </div>
                    </div>

                    {/* Impact angle */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60 flex items-center gap-1">
                          <Crosshair className="w-3 h-3" /> Impact Angle
                        </span>
                        <span className="text-white font-mono">
                          {angleDegs}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={90}
                        step={1}
                        value={angleDegs}
                        onChange={(e) => setAngleDegs(parseInt(e.target.value))}
                        className="w-full accent-purple-500 h-1.5"
                        disabled={phase !== "idle"}
                      />
                      <div className="flex justify-between text-[10px] text-white/30">
                        <span>5° grazing</span>
                        <span>90° head-on</span>
                      </div>
                    </div>
                  </div>

                  {/* Impact location */}
                  <div>
                    <h3 className="text-sm font-semibold text-white/70 mb-2 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Impact Location
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {LOCATIONS.map((loc) => (
                        <button
                          key={loc.name}
                          onClick={() => applyLocation(loc)}
                          className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                          disabled={phase !== "idle"}
                        >
                          {loc.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-white/40">Lat</label>
                        <input
                          type="number"
                          value={impactLat.toFixed(1)}
                          onChange={(e) =>
                            setImpactLat(parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-white/5 rounded px-2 py-1 text-xs text-white border border-white/10 focus:border-accent-primary outline-none"
                          disabled={phase !== "idle"}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-white/40">Lng</label>
                        <input
                          type="number"
                          value={impactLng.toFixed(1)}
                          onChange={(e) =>
                            setImpactLng(parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-white/5 rounded px-2 py-1 text-xs text-white border border-white/10 focus:border-accent-primary outline-none"
                          disabled={phase !== "idle"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <motion.button
                      onClick={
                        phase === "idle" ? launchSimulation : resetSimulation
                      }
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                        phase === "idle" ?
                          "bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {phase === "idle" ?
                        <>
                          <Rocket className="w-4 h-4" />
                          Launch Impact
                        </>
                      : <>
                          <RotateCcw className="w-4 h-4" />
                          Reset
                        </>
                      }
                    </motion.button>
                  </div>

                  {/* Disclaimer */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
                    <p className="text-[10px] text-blue-300/70 flex items-start gap-1.5">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      This is a simplified physics model for entertainment
                      purposes. Real impact dynamics are far more complex. Don't
                      panic! 🌍
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── 3D Viewport ─────────────────────────────────────── */}
          <div
            className={`flex-1 relative ${isFullscreen ? "h-full" : "min-h-[350px] sm:min-h-[500px] lg:min-h-0"}`}
          >
            <div className="absolute inset-0 rounded-2xl overflow-hidden border border-white/5">
              <ImpactSimulator
                className="w-full h-full"
                params={params}
                phase={phase}
                progress={progress}
                impactPoint={impactPoint}
                asteroidPos={asteroidPos}
                asteroidStartPos={asteroidStartPos}
                explosionIntensity={explosionIntensity}
              />
            </div>

            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              className="absolute top-3 right-3 z-10 p-2 rounded-lg glass border border-white/10 hover:bg-white/10 transition-colors"
            >
              {isFullscreen ?
                <Minimize2 className="w-4 h-4 text-white/70" />
              : <Maximize2 className="w-4 h-4 text-white/70" />}
            </button>

            {/* Panel toggle (fullscreen) */}
            {isFullscreen && (
              <button
                onClick={() => setShowPanel((p) => !p)}
                className="absolute top-3 left-3 z-10 p-2 rounded-lg glass border border-white/10 hover:bg-white/10 transition-colors"
              >
                {showPanel ?
                  <ChevronUp className="w-4 h-4 text-white/70" />
                : <ChevronDown className="w-4 h-4 text-white/70" />}
              </button>
            )}

            {/* Phase indicator */}
            <div className="absolute bottom-3 left-3 z-10">
              <div className="glass rounded-lg border border-white/10 px-3 py-1.5 flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    phase === "idle" ? "bg-green-400"
                    : phase === "approaching" ? "bg-yellow-400 animate-pulse"
                    : phase === "impact" ? "bg-red-500 animate-pulse"
                    : "bg-orange-400"
                  }`}
                />
                <span className="text-xs text-white/70 font-medium capitalize">
                  {phase === "idle" ?
                    "Ready"
                  : phase === "approaching" ?
                    "Inbound..."
                  : phase === "impact" ?
                    "IMPACT!"
                  : "Aftermath"}
                </span>
              </div>
            </div>

            {/* Impact Stats Overlay */}
            <AnimatePresence>
              {showStats && impactResults && (
                <motion.div
                  className={`absolute ${
                    isFullscreen ?
                      "top-4 right-16 w-72"
                    : "top-3 right-14 w-60 sm:w-72"
                  } z-10`}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="glass rounded-2xl border border-red-500/20 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      Impact Analysis
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                      <StatBlock
                        label="Energy"
                        value={impactResults.tntEquivalent}
                        icon={<Zap className="w-3 h-3" />}
                        color="text-yellow-400"
                      />
                      <StatBlock
                        label="Crater"
                        value={
                          impactResults.craterDiameterKm >= 1 ?
                            `${impactResults.craterDiameterKm.toFixed(1)} km`
                          : `${(impactResults.craterDiameterKm * 1000).toFixed(0)} m`
                        }
                        icon={<Target className="w-3 h-3" />}
                        color="text-orange-400"
                      />
                      <StatBlock
                        label="Earthquake"
                        value={`M ${impactResults.earthquakeMagnitude.toFixed(1)}`}
                        icon={<Activity className="w-3 h-3" />}
                        color="text-red-400"
                      />
                      <StatBlock
                        label="Fireball"
                        value={
                          impactResults.fireballRadiusKm >= 1 ?
                            `${impactResults.fireballRadiusKm.toFixed(1)} km`
                          : `${(impactResults.fireballRadiusKm * 1000).toFixed(0)} m`
                        }
                        icon={<Flame className="w-3 h-3" />}
                        color="text-amber-400"
                      />
                      <StatBlock
                        label="Ejecta Height"
                        value={`${impactResults.ejectaHeightKm.toFixed(1)} km`}
                        icon={<Wind className="w-3 h-3" />}
                        color="text-cyan-400"
                      />
                      <StatBlock
                        label="Mass"
                        value={`${fmt(impactResults.massKg)} kg`}
                        icon={<Mountain className="w-3 h-3" />}
                        color="text-green-400"
                      />
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                      <p className="text-[11px] text-red-300/80 font-medium">
                        {impactResults.comparison}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StatBlock = ({ label, value, icon, color }) => (
  <div className="bg-white/5 rounded-lg p-2">
    <div className={`text-[10px] ${color} flex items-center gap-1 mb-0.5`}>
      {icon} {label}
    </div>
    <div className="text-xs text-white font-mono font-bold truncate">
      {value}
    </div>
  </div>
);

export default ImpactVisualizer;
