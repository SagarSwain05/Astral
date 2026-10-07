/**
 * Orbit Service
 * Derives the real Earth-approach geometry of an asteroid from its JPL
 * osculating orbital elements (NASA NeoWs lookup → orbital_data).
 *
 * Both the asteroid and Earth are propagated as two-body Keplerian orbits to
 * NASA's close-approach time. That gives the geocentric direction the
 * asteroid is in at closest approach (n̂) and the direction of its relative
 * velocity (û). The client then reconstructs the flyby as
 *     r(t) = d_miss · n̂ + v_rel · (t − t_CA) · û
 * using NASA's exact miss distance and relative speed, so magnitudes are
 * NASA's and only the orientation comes from the propagation.
 *
 * Frame: heliocentric / geocentric ecliptic J2000, unit vectors.
 */

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;

const solveKepler = (M, e) => {
    let E = e < 0.8 ? M : Math.PI;
    for (let i = 0; i < 30; i++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < 1e-12) break;
    }
    return E;
};

/**
 * Heliocentric ecliptic position (AU) from classical elements at Julian date.
 * Angles in degrees; meanMotion in deg/day.
 */
const keplerPosition = (el, jd) => {
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

/**
 * Earth–Moon barycentre heliocentric elements (Standish, JPL "Approximate
 * Positions of the Planets", valid 1800–2050, error ≲ 1′).
 */
const earthElements = (jd) => {
    const T = (jd - 2451545.0) / 36525;
    const a = 1.00000261 + 0.00000562 * T;
    const e = 0.01671123 - 0.00004392 * T;
    const I = -0.00001531 - 0.01294668 * T;
    const L = 100.46457166 + 35999.37244981 * T;
    const varpi = 102.93768193 + 0.32327364 * T;
    const node = 0;
    return {
        semiMajorAxis: a,
        eccentricity: e,
        inclination: I,
        ascendingNode: node,
        perihelionArgument: varpi - node,
        meanAnomaly: L - varpi,
        meanMotion: 0,
        epoch: jd,
    };
};

const earthPosition = (jd) => keplerPosition(earthElements(jd), jd);

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => Math.sqrt(dot(a, a));
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const unit = (a) => scale(a, 1 / norm(a));

export const toJulianDate = (date) => new Date(date).getTime() / 86400000 + 2440587.5;

/**
 * Convert NeoWs `orbital_data` into our numeric element set.
 */
export const parseOrbitalData = (od) => {
    if (!od) return null;
    const num = (v) => (v === undefined || v === null ? null : parseFloat(v));
    const elements = {
        epoch: num(od.epoch_osculation),
        eccentricity: num(od.eccentricity),
        semiMajorAxis: num(od.semi_major_axis),
        inclination: num(od.inclination),
        ascendingNode: num(od.ascending_node_longitude),
        perihelionArgument: num(od.perihelion_argument),
        meanAnomaly: num(od.mean_anomaly),
        meanMotion: num(od.mean_motion),
    };
    if (Object.values(elements).some((v) => v === null || Number.isNaN(v))) return null;
    if (elements.eccentricity >= 1) return null;

    return {
        elements,
        orbitClass: od.orbit_class?.orbit_class_type || null,
        orbitClassDescription: od.orbit_class?.orbit_class_description || null,
        moidAu: num(od.minimum_orbit_intersection),
        periodDays: num(od.orbital_period),
        perihelionAu: num(od.perihelion_distance),
        aphelionAu: num(od.aphelion_distance),
        firstObservation: od.first_observation_date || null,
        lastObservation: od.last_observation_date || null,
        observationsUsed: num(od.observations_used),
        orbitUncertainty: od.orbit_uncertainty ?? null,
    };
};

/**
 * Approach geometry at close-approach time.
 * @returns {{ n:number[], u:number[], modelMissKm:number, source:string, tca:Date }}
 */
export const computeApproachGeometry = (elements, closeApproachDate) => {
    const jd = toJulianDate(closeApproachDate);
    const dt = 1 / 24; // 1 hour, for the numerical relative velocity

    const rel = (t) => sub(keplerPosition(elements, t), earthPosition(t));

    const r = rel(jd);
    const v = scale(sub(rel(jd + dt), rel(jd - dt)), 1 / (2 * dt)); // AU/day

    const n = unit(r);
    // Velocity component perpendicular to n̂ (at true closest approach r ⟂ v)
    let u = sub(v, scale(n, dot(v, n)));
    if (norm(u) < 1e-12) u = [-n[1], n[0], 0];
    u = unit(u);

    const round = (a) => a.map((x) => Number(x.toFixed(6)));

    return {
        n: round(n),
        u: round(u),
        modelMissKm: Math.round(norm(r) * AU_KM),
        modelSpeedKmS: Number(((norm(v) * AU_KM) / 86400).toFixed(3)),
        source: 'jpl-elements',
        tca: new Date(closeApproachDate),
    };
};

export default { parseOrbitalData, computeApproachGeometry, toJulianDate };
