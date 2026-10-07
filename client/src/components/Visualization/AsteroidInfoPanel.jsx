import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Crosshair,
  Navigation,
  Ruler,
  Gauge,
  Orbit,
  Timer,
  ShieldCheck,
} from "lucide-react";
import {
  makeTrajectory,
  kmToLD,
  formatKm,
  formatRelative,
  flybyPhase,
  PHASE_LABEL,
  LUNAR_DISTANCE_KM,
  EARTH_RADIUS_KM,
} from "../../utils/ephemeris";
import { RISK_COLORS } from "../../utils/riskColors";
import useMediaQuery from "../../hooks/useMediaQuery";

const HOUR = 3600000;

const SIZE_REFERENCES = [
  [4.5, "a car"],
  [12, "a bus"],
  [30, "a blue whale"],
  [93, "the Statue of Liberty"],
  [109, "a football field"],
  [330, "the Eiffel Tower"],
  [828, "the Burj Khalifa"],
  [2000, "a small town"],
];

const sizeComparison = (m) => {
  if (!m) return null;
  const [ref, name] = SIZE_REFERENCES.reduce((best, cur) =>
    Math.abs(Math.log(m / cur[0])) < Math.abs(Math.log(m / best[0])) ? cur : best,
  );
  const ratio = m / ref;
  if (ratio > 0.8 && ratio < 1.25) return `about the size of ${name}`;
  return ratio > 1 ?
      `${ratio.toFixed(1)}× ${name}`
    : `${(1 / ratio).toFixed(1)}× smaller than ${name}`;
};

/** Live state of the asteroid at the current simulation time */
const useLiveState = (asteroid, timeOffset) => {
  const traj = useMemo(() => makeTrajectory(asteroid), [asteroid]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const t = now + timeOffset * HOUR;
  const p = traj.at(t);
  const p2 = traj.at(t + 60000);
  const dist = Math.hypot(...p);
  const dist2 = Math.hypot(...p2);
  const phase = flybyPhase(new Date(asteroid.closeApproachDate).getTime() - t);
  return {
    t,
    distKm: dist,
    phase,
    radialKmS: Math.abs(dist2 - dist) / 60,
    source: traj.source,
  };
};

const Row = ({ label, value, sub }) => (
  <div className="flex justify-between gap-3 py-1.5 border-b border-white/5 last:border-0">
    <span className="text-white/45 text-xs">{label}</span>
    <span className="text-right">
      <span className="text-white text-xs font-medium font-mono">{value}</span>
      {sub && <span className="block text-[10px] text-white/40">{sub}</span>}
    </span>
  </div>
);

const Section = ({ icon: Icon, title, children }) => (
  <div>
    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/40 mb-1">
      <Icon className="w-3.5 h-3.5" /> {title}
    </p>
    {children}
  </div>
);

const Details = ({ asteroid, live, onJumpTo, timeOffset }) => {
  const color = RISK_COLORS[asteroid.riskCategory] || RISK_COLORS.minimal;
  const tca = new Date(asteroid.closeApproachDate).getTime();
  const untilCa = tca - live.t;
  const orbit = asteroid.orbit?.elements ? asteroid.orbit : null;
  const d = asteroid.estimatedDiameterMax;

  return (
    <div className="space-y-4">
      {/* Live */}
      <div className="rounded-xl bg-space-800/70 border border-white/10 p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wider text-white/40">
            {timeOffset === 0 ? "Live position" : "Position at selected time"}
          </span>
          <span
            className={`text-[11px] font-semibold flex items-center gap-1 ${
              live.phase === "approaching" ? "text-amber-300"
              : live.phase === "closest" ? "text-sky-300"
              : "text-emerald-300"
            }`}
          >
            <Navigation className={`w-3 h-3 ${live.phase === "approaching" ? "rotate-180" : ""}`} />
            {PHASE_LABEL[live.phase]}
          </span>
        </div>
        <p className="text-2xl font-bold text-white font-mono">
          {kmToLD(live.distKm).toFixed(2)} <span className="text-sm text-white/50">LD</span>
        </p>
        <p className="text-xs text-white/50">
          {formatKm(live.distKm)} from Earth
          {live.phase !== "closest" &&
            ` · ${live.radialKmS.toFixed(2)} km/s ${live.phase === "approaching" ? "closing" : "opening"}`}
        </p>
      </div>

      <Section icon={Crosshair} title="Closest approach">
        <Row
          label="When"
          value={new Date(tca).toUTCString().slice(5, 22) + " UTC"}
          sub={formatRelative(untilCa)}
        />
        <Row
          label="Miss distance"
          value={`${asteroid.missDistanceLunar?.toFixed(2)} LD`}
          sub={`${formatKm(asteroid.missDistanceKm)} · ${Math.round(asteroid.missDistanceKm / EARTH_RADIUS_KM).toLocaleString()} Earth radii`}
        />
        <Row
          label="Relative speed"
          value={`${asteroid.relativeVelocityKmS?.toFixed(2)} km/s`}
          sub={`${Math.round(asteroid.relativeVelocityKmS * 3600).toLocaleString()} km/h`}
        />
        {asteroid.missDistanceKm < LUNAR_DISTANCE_KM && (
          <p className="text-[11px] text-amber-300 mt-1">Passes inside the Moon's orbit.</p>
        )}
        <button
          onClick={() => onJumpTo((tca - Date.now()) / HOUR)}
          className="mt-2 w-full text-xs py-1.5 rounded-lg bg-accent-primary/10 border border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20 flex items-center justify-center gap-1.5"
        >
          <Timer className="w-3.5 h-3.5" /> Jump to closest approach
        </button>
      </Section>

      <Section icon={Ruler} title="Physical">
        <Row
          label="Diameter"
          value={`${Math.round(asteroid.estimatedDiameterMin || 0)}–${Math.round(d || 0)} m`}
          sub={sizeComparison(d)}
        />
        {asteroid.absolute_magnitude_h != null && (
          <Row label="Absolute magnitude" value={`H ${asteroid.absolute_magnitude_h.toFixed(1)}`} />
        )}
      </Section>

      <Section icon={Gauge} title="ASTRAL risk">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-white/50 capitalize">{asteroid.riskCategory}</span>
          <span className="font-mono font-bold" style={{ color }}>
            {asteroid.riskScore}/100
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${asteroid.riskScore}%`, backgroundColor: color }} />
        </div>
      </Section>

      <Section icon={Orbit} title="Heliocentric orbit (JPL)">
        {orbit ?
          <>
            <Row label="Class" value={orbit.orbitClass || "—"} sub={orbit.orbitClassDescription?.replace(/\.$/, "")} />
            <Row label="Period" value={orbit.periodDays ? `${(orbit.periodDays / 365.25).toFixed(2)} yr` : "—"} />
            <Row
              label="a · e · i"
              value={`${orbit.elements.semiMajorAxis.toFixed(3)} AU · ${orbit.elements.eccentricity.toFixed(3)} · ${orbit.elements.inclination.toFixed(1)}°`}
            />
            {orbit.moidAu != null && (
              <Row
                label="Earth MOID"
                value={`${(orbit.moidAu * 149597870.7 / LUNAR_DISTANCE_KM).toFixed(2)} LD`}
                sub="minimum possible orbit separation"
              />
            )}
            {orbit.firstObservation && (
              <Row label="Observed" value={`${orbit.firstObservation} → ${orbit.lastObservation}`} sub={orbit.observationsUsed ? `${orbit.observationsUsed} observations` : null} />
            )}
          </>
        : <p className="text-xs text-white/40">Orbital elements are still loading from NASA — the path shown is a straight-line estimate through NASA's miss distance.</p>}
      </Section>

      {live.source === "jpl" && orbit?.fidelity && (
        <p className="flex items-start gap-1.5 text-[11px] text-emerald-300/80">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          Path propagated from JPL orbital elements; it reproduces NASA's miss
          distance within {Math.max(0.1, Math.abs(orbit.fidelity - 1) * 100).toFixed(1)}%.
        </p>
      )}
      {live.source === "jpl-anchored" && (
        <p className="flex items-start gap-1.5 text-[11px] text-amber-300/80">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          This orbit solution is poorly constrained, so the path is a straight
          flyby through NASA's published miss distance and speed, oriented by
          the JPL approach geometry.
        </p>
      )}
    </div>
  );
};

const AsteroidInfoPanel = ({ asteroid, timeOffset = 0, onClose, onNavigate, onJumpTo }) => {
  const isCompact = useMediaQuery("(max-width: 1024px)");
  const [expanded, setExpanded] = useState(false);

  return (
    <AnimatePresence>
      {asteroid && (
        <PanelBody
          key={asteroid.neo_reference_id}
          asteroid={asteroid}
          timeOffset={timeOffset}
          onClose={onClose}
          onNavigate={onNavigate}
          onJumpTo={onJumpTo}
          isCompact={isCompact}
          expanded={expanded}
          setExpanded={setExpanded}
        />
      )}
    </AnimatePresence>
  );
};

const PanelBody = ({ asteroid, timeOffset, onClose, onNavigate, onJumpTo, isCompact, expanded, setExpanded }) => {
  const live = useLiveState(asteroid, timeOffset);
  const color = RISK_COLORS[asteroid.riskCategory] || RISK_COLORS.minimal;
  const name = asteroid.name?.replace(/[()]/g, "").trim();

  const header = (
    <div className="flex items-start gap-3">
      <span className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-bold truncate">{name}</h3>
        <p className="text-xs text-white/50 flex items-center gap-2">
          {asteroid.isPotentiallyHazardous && (
            <span className="text-rose-400 font-semibold flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" /> PHA
            </span>
          )}
          {kmToLD(live.distKm).toFixed(2)} LD · {PHASE_LABEL[live.phase].toLowerCase()}
        </p>
      </div>
      {isCompact && (
        <button onClick={() => setExpanded((v) => !v)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50" aria-label="Toggle details">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      )}
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50" aria-label="Close">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const footer = (
    <button
      onClick={() => onNavigate(asteroid.neo_reference_id)}
      className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
    >
      Full report, history & discussion <ExternalLink className="w-4 h-4" />
    </button>
  );

  if (isCompact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="fixed inset-x-0 bottom-[164px] mx-auto w-[calc(100%-1.5rem)] max-w-md glass rounded-2xl shadow-2xl z-30 p-3"
      >
        {header}
        {expanded && (
          <div className="mt-3 max-h-[45vh] overflow-y-auto pr-1 space-y-3">
            <Details asteroid={asteroid} live={live} onJumpTo={onJumpTo} timeOffset={timeOffset} />
            {footer}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className="absolute top-20 right-4 bottom-40 w-80 glass p-4 z-20 flex flex-col"
    >
      {header}
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        <Details asteroid={asteroid} live={live} onJumpTo={onJumpTo} timeOffset={timeOffset} />
      </div>
      <div className="pt-3">{footer}</div>
    </motion.div>
  );
};

export default AsteroidInfoPanel;
