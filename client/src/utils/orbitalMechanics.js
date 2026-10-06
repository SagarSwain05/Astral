import * as THREE from "three";

// ─── Constants ───────────────────────────────────────────────────────
const AU_KM = 149597870.7; // 1 AU in km
const EARTH_RADIUS_KM = 6371; // Earth mean radius
const SCENE_SCALE = 2; // Earth radius = 2 in scene units
const KM_TO_SCENE = SCENE_SCALE / EARTH_RADIUS_KM;
const AU_TO_SCENE = AU_KM * KM_TO_SCENE;

// Simplified scale for visualization (AU distances would be enormous)
// We compress distances so orbits are visible around the Earth model
const VIS_SCALE = 0.00004; // visual compression factor for km distances

export { AU_KM, EARTH_RADIUS_KM, SCENE_SCALE, KM_TO_SCENE, VIS_SCALE };

// ─── Orbital Elements Estimator ──────────────────────────────────────
// When we don't have full Keplerian elements from NASA, we estimate a
// plausible elliptical orbit from the close-approach data we DO have.

/**
 * Build approximate orbital parameters from asteroid close-approach data.
 * Returns { semiMajor, eccentricity, inclination, ascendingNode, argPeriapsis, period }
 * Distances are in scene units.
 */
export function estimateOrbit(asteroid) {
  const missKm = asteroid.missDistanceKm || 1_000_000;
  const velocityKmS = asteroid.relativeVelocityKmS || 15;
  const hazardous = asteroid.isPotentiallyHazardous;

  // Scene-unit periapsis = miss distance scaled for visualization
  const periapsisScene = 2.5 + missKm * VIS_SCALE;

  // Derive eccentricity from velocity: faster => more eccentric orbit
  const eccentricity = Math.min(0.85, 0.15 + velocityKmS / 60);

  // Semi-major axis from periapsis & eccentricity:  a = rp / (1 - e)
  const semiMajor = periapsisScene / (1 - eccentricity);

  // Inclination: hazardous objects tend to have lower inclination (more dangerous)
  const baseInclination = hazardous ? 5 : 15;
  const inclination =
    baseInclination + seededRandom(asteroid.neo_reference_id, 0) * 25;

  // Random-ish orientation using name-hash for determinism
  const ascendingNode = seededRandom(asteroid.neo_reference_id, 1) * 360;
  const argPeriapsis = seededRandom(asteroid.neo_reference_id, 2) * 360;

  // Approximate period in hours (Kepler's 3rd, very rough)
  const periodHours = 6 + semiMajor * 2;

  return {
    semiMajor,
    eccentricity,
    inclination,
    ascendingNode,
    argPeriapsis,
    periodHours,
  };
}

// ─── Orbit Geometry ──────────────────────────────────────────────────

/**
 * Generate an array of THREE.Vector3 points tracing an elliptical orbit.
 * @param {Object} orbital - orbital elements from estimateOrbit
 * @param {number} segments - number of points (default 256)
 */
export function computeOrbitPoints(orbital, segments = 256) {
  const {
    semiMajor: a,
    eccentricity: e,
    inclination,
    ascendingNode,
    argPeriapsis,
  } = orbital;

  const b = a * Math.sqrt(1 - e * e); // semi-minor axis
  const c = a * e; // focus offset

  // Build rotation matrix from orbital elements
  const incRad = THREE.MathUtils.degToRad(inclination);
  const oanRad = THREE.MathUtils.degToRad(ascendingNode);
  const apRad = THREE.MathUtils.degToRad(argPeriapsis);

  const rotMatrix = new THREE.Matrix4();
  rotMatrix.makeRotationZ(oanRad);
  rotMatrix.multiply(new THREE.Matrix4().makeRotationX(incRad));
  rotMatrix.multiply(new THREE.Matrix4().makeRotationZ(apRad));

  const points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    // Ellipse in local frame (focus at origin)
    const x = a * Math.cos(theta) - c;
    const y = b * Math.sin(theta);
    const z = 0;

    const v = new THREE.Vector3(x, y, z);
    v.applyMatrix4(rotMatrix);
    points.push(v);
  }
  return points;
}

/**
 * Get the position on an orbit at a given time offset (hours from now).
 * @param {Object} orbital - orbital elements
 * @param {number} hoursOffset - time from present (can be negative)
 * @returns {THREE.Vector3}
 */
export function getPositionAtTime(orbital, hoursOffset = 0) {
  const {
    semiMajor: a,
    eccentricity: e,
    inclination,
    ascendingNode,
    argPeriapsis,
    periodHours,
  } = orbital;

  const b = a * Math.sqrt(1 - e * e);
  const c = a * e;

  // Mean anomaly from time
  const meanAnomaly =
    ((hoursOffset / periodHours) * Math.PI * 2) % (Math.PI * 2);

  // Solve Kepler's equation M = E - e*sin(E) via Newton-Raphson
  let E = meanAnomaly;
  for (let iter = 0; iter < 10; iter++) {
    E = E - (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
  }

  // True anomaly
  const trueAnomaly =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    );

  const x = a * Math.cos(trueAnomaly) - c;
  const y = b * Math.sin(trueAnomaly);
  const z = 0;

  // Apply orbital rotations
  const incRad = THREE.MathUtils.degToRad(inclination);
  const oanRad = THREE.MathUtils.degToRad(ascendingNode);
  const apRad = THREE.MathUtils.degToRad(argPeriapsis);

  const rotMatrix = new THREE.Matrix4();
  rotMatrix.makeRotationZ(oanRad);
  rotMatrix.multiply(new THREE.Matrix4().makeRotationX(incRad));
  rotMatrix.multiply(new THREE.Matrix4().makeRotationZ(apRad));

  const v = new THREE.Vector3(x, y, z);
  v.applyMatrix4(rotMatrix);
  return v;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Deterministic seeded random from a string key + index */
function seededRandom(str, index) {
  let hash = 0;
  const s = (str || "default") + index.toString();
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(Math.sin(hash)) % 1;
}

/** Map risk category to a THREE.Color */
export function riskColor(category) {
  switch (category) {
    case "high":
      return new THREE.Color("#ef4444");
    case "moderate":
      return new THREE.Color("#f59e0b");
    case "low":
      return new THREE.Color("#eab308");
    default:
      return new THREE.Color("#22c55e");
  }
}

/** Map risk category to a hex string */
export function riskHex(category) {
  switch (category) {
    case "high":
      return "#ef4444";
    case "moderate":
      return "#f59e0b";
    case "low":
      return "#eab308";
    default:
      return "#22c55e";
  }
}

/** Format km distance to a human readable string */
export function formatDistance(km) {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)}M km`;
  if (km >= 1_000) return `${(km / 1_000).toFixed(1)}K km`;
  return `${km.toFixed(0)} km`;
}

/** Format velocity */
export function formatVelocity(kmS) {
  return `${kmS.toFixed(2)} km/s`;
}
