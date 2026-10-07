/**
 * Ephemeris utilities for the 3D orbital view.
 *
 * Everything is computed in the geocentric ecliptic J2000 frame (km) and only
 * converted to scene space at the end:
 *   scene.x = ecl.x,  scene.y = ecl.z (ecliptic north is "up"),  scene.z = −ecl.y
 *
 * - Asteroids: two-body Kepler propagation of their JPL osculating elements,
 *   minus Earth's heliocentric position (Standish approximate elements).
 *   Validated server-side to reproduce NASA's miss distance & speed.
 * - Sun: Earth's position negated.
 * - Moon: low-precision lunar theory (Astronomical Almanac, ~0.3° accuracy).
 * - Earth spin: Greenwich Mean Sidereal Time.
 */
import * as THREE from "three";

const DEG = Math.PI / 180;
export const AU_KM = 149597870.7;
export const EARTH_RADIUS_KM = 6371;
export const LUNAR_DISTANCE_KM = 384400;
export const OBLIQUITY = 23.4393 * DEG;

// ─── Time ────────────────────────────────────────────────────────────
export const julianDate = (ms) => ms / 86400000 + 2440587.5;

/** Greenwich Mean Sidereal Time (radians) */
export const gmst = (jd) => {
  const d = jd - 2451545.0;
  return ((((280.46061837 + 360.98564736629 * d) % 360) + 360) % 360) * DEG;
};

// ─── Kepler propagation ──────────────────────────────────────────────
const solveKepler = (M, e) => {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 25; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
};

/** Heliocentric ecliptic position in AU */
export const keplerPosition = (el, jd) => {
  const M = ((el.meanAnomaly + el.meanMotion * (jd - el.epoch)) % 360) * DEG;
  const e = el.eccentricity;
  const E = solveKepler(M, e);
  const xp = el.semiMajorAxis * (Math.cos(E) - e);
  const yp = el.semiMajorAxis * Math.sqrt(1 - e * e) * Math.sin(E);
  const O = el.ascendingNode * DEG;
  const w = el.perihelionArgument * DEG;
  const i = el.inclination * DEG;
  const cO = Math.cos(O), sO = Math.sin(O);
  const cw = Math.cos(w), sw = Math.sin(w);
  const ci = Math.cos(i), si = Math.sin(i);
  return [
    (cO * cw - sO * sw * ci) * xp + (-cO * sw - sO * cw * ci) * yp,
    (sO * cw + cO * sw * ci) * xp + (-sO * sw + cO * cw * ci) * yp,
    sw * si * xp + cw * si * yp,
  ];
};

/** Earth–Moon barycentre, heliocentric ecliptic AU (Standish elements) */
export const earthHelio = (jd) => {
  const T = (jd - 2451545.0) / 36525;
  const L = 100.46457166 + 35999.37244981 * T;
  const varpi = 102.93768193 + 0.32327364 * T;
  return keplerPosition(
    {
      semiMajorAxis: 1.00000261 + 0.00000562 * T,
      eccentricity: 0.01671123 - 0.00004392 * T,
      inclination: -0.00001531 - 0.01294668 * T,
      ascendingNode: 0,
      perihelionArgument: varpi,
      meanAnomaly: L - varpi,
      meanMotion: 0,
      epoch: jd,
    },
    jd,
  );
};

/** Geocentric ecliptic position of an asteroid, km */
export const asteroidGeocentricKm = (elements, jd) => {
  const a = keplerPosition(elements, jd);
  const e = earthHelio(jd);
  return [(a[0] - e[0]) * AU_KM, (a[1] - e[1]) * AU_KM, (a[2] - e[2]) * AU_KM];
};

/** Unit vector from Earth to the Sun (ecliptic) */
export const sunDirectionEcl = (jd) => {
  const e = earthHelio(jd);
  const r = Math.hypot(e[0], e[1], e[2]);
  return [-e[0] / r, -e[1] / r, -e[2] / r];
};

/** Geocentric ecliptic Moon position, km (low-precision lunar theory) */
export const moonGeocentricKm = (jd) => {
  const T = (jd - 2451545.0) / 36525;
  const s = (deg) => Math.sin(deg * DEG);
  const c = (deg) => Math.cos(deg * DEG);
  const lambda =
    218.32 + 481267.881 * T +
    6.29 * s(135.0 + 477198.87 * T) - 1.27 * s(259.3 - 413335.36 * T) +
    0.66 * s(235.7 + 890534.22 * T) + 0.21 * s(269.9 + 954397.74 * T) -
    0.19 * s(357.5 + 35999.05 * T) - 0.11 * s(186.5 + 966404.03 * T);
  const beta =
    5.13 * s(93.3 + 483202.02 * T) + 0.28 * s(228.2 + 960400.89 * T) -
    0.28 * s(318.3 + 6003.15 * T) - 0.17 * s(217.6 - 407332.21 * T);
  const parallax =
    0.9508 + 0.0518 * c(135.0 + 477198.87 * T) + 0.0095 * c(259.3 - 413335.38 * T) +
    0.0078 * c(235.7 + 890534.23 * T) + 0.0028 * c(269.9 + 954397.7 * T);
  const r = EARTH_RADIUS_KM / Math.sin(parallax * DEG);
  return [
    r * Math.cos(beta * DEG) * Math.cos(lambda * DEG),
    r * Math.cos(beta * DEG) * Math.sin(lambda * DEG),
    r * Math.sin(beta * DEG),
  ];
};

// ─── Straight-line flyby fallback (when no JPL elements are available) ─
const hash = (str, salt) => {
  let h = 2166136261;
  const s = `${str}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

const fallbackGeometry = (asteroid) => {
  const theta = hash(asteroid.neo_reference_id, 1) * Math.PI * 2;
  const z = hash(asteroid.neo_reference_id, 2) * 0.6 - 0.3;
  const n = [Math.sqrt(1 - z * z) * Math.cos(theta), Math.sqrt(1 - z * z) * Math.sin(theta), z];
  // any vector perpendicular to n
  const u0 = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const d = u0[0] * n[0] + u0[1] * n[1] + u0[2] * n[2];
  let u = [u0[0] - d * n[0], u0[1] - d * n[1], u0[2] - d * n[2]];
  const len = Math.hypot(...u);
  u = u.map((x) => x / len);
  return { n, u };
};

/**
 * Build a position function for one asteroid: ms timestamp → ecliptic km.
 * Uses real Kepler propagation when JPL elements are present; otherwise a
 * linear flyby through NASA's miss distance with an estimated orientation.
 */
export const makeTrajectory = (asteroid) => {
  const orbit = asteroid.orbit;
  const el = orbit?.elements;
  const fidelity = orbit?.fidelity;

  // Normal case: real Kepler propagation, scaled by the (tiny) model/NASA
  // ratio so the closest approach lands exactly on NASA's miss distance
  if (el && fidelity && Math.abs(fidelity - 1) <= 0.15) {
    const k = 1 / fidelity;
    return {
      source: "jpl",
      at: (ms) => asteroidGeocentricKm(el, julianDate(ms)).map((x) => x * k),
    };
  }

  // Poorly constrained orbit (e.g. very old epoch): straight-line flyby with
  // NASA's miss distance & speed, oriented by the JPL-derived approach geometry
  const { n, u } = orbit?.approach || fallbackGeometry(asteroid);
  const anchored = Boolean(orbit?.approach);
  const tca = new Date(asteroid.closeApproachDate).getTime();
  const d = asteroid.missDistanceKm || LUNAR_DISTANCE_KM * 20;
  const v = asteroid.relativeVelocityKmS || 15;
  return {
    source: anchored ? "jpl-anchored" : "estimated",
    at: (ms) => {
      const s = v * ((ms - tca) / 1000);
      return [d * n[0] + s * u[0], d * n[1] + s * u[1], d * n[2] + s * u[2]];
    },
  };
};

// ─── Scene mapping ───────────────────────────────────────────────────
export const EARTH_SCENE_RADIUS = 2;
const LOG_K = 3.1;

/**
 * Logarithmic radial compression: keeps true directions, compresses distance
 * so a 400-km satellite and a 100-LD asteroid fit in one view.
 */
export const radiusToScene = (km) =>
  EARTH_SCENE_RADIUS *
  (1 + LOG_K * Math.log10(Math.max(1, km / EARTH_RADIUS_KM)));

export const eclToScene = (v, out = new THREE.Vector3()) => {
  const r = Math.hypot(v[0], v[1], v[2]) || 1;
  const R = radiusToScene(r);
  return out.set((v[0] / r) * R, (v[2] / r) * R, (-v[1] / r) * R);
};

/** Direction only (unit) in scene space */
export const eclDirToScene = (v, out = new THREE.Vector3()) =>
  out.set(v[0], v[2], -v[1]).normalize();

/** Equatorial → ecliptic rotation, then to scene axes */
const eqToEclScene = (x, y, z) => {
  const ce = Math.cos(OBLIQUITY), se = Math.sin(OBLIQUITY);
  const X = x;
  const Y = y * ce + z * se;
  const Z = -y * se + z * ce;
  return new THREE.Vector3(X, Z, -Y);
};

/**
 * Earth mesh orientation at a Julian date. Three's SphereGeometry maps the
 * texture so local +x = Greenwich meridian, +y = north pole, −z = 90° E.
 */
export const earthQuaternion = (jd, out = new THREE.Quaternion()) => {
  const g = gmst(jd);
  const greenwich = eqToEclScene(Math.cos(g), Math.sin(g), 0);
  const north = eqToEclScene(0, 0, 1);
  const east90 = eqToEclScene(-Math.sin(g), Math.cos(g), 0);
  const m = new THREE.Matrix4().makeBasis(greenwich, north, east90.negate());
  return out.setFromRotationMatrix(m);
};

/**
 * Flyby phase from NASA's (n-body) close-approach time — authoritative over
 * the two-body model, whose distance minimum can drift by an hour or two.
 */
export const flybyPhase = (untilCaMs) => {
  if (Math.abs(untilCaMs) <= 3 * 3600000) return "closest";
  return untilCaMs > 0 ? "approaching" : "receding";
};

export const PHASE_LABEL = {
  closest: "At closest approach",
  approaching: "Approaching",
  receding: "Receding",
};

// ─── Formatting ──────────────────────────────────────────────────────
export const kmToLD = (km) => km / LUNAR_DISTANCE_KM;

export const formatKm = (km) => {
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)} M km`;
  if (km >= 1e3) return `${Math.round(km).toLocaleString()} km`;
  return `${km.toFixed(0)} km`;
};

export const formatRelative = (ms) => {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86400000);
  const h = Math.floor((abs % 86400000) / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const body = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
  return ms >= 0 ? `in ${body}` : `${body} ago`;
};
