# Astral Technical Guide — Risk Analysis, Orbital Mechanics & Impact Physics

This document explains the science and math behind Astral's core calculations. It covers how the app evaluates asteroid risk, estimates orbits for visualization, and simulates hypothetical impacts.

---

## Table of Contents

1. [Risk Analysis Engine](#risk-analysis-engine)
2. [Orbital Mechanics & Visualization](#orbital-mechanics--visualization)
3. [Impact Physics Simulator](#impact-physics-simulator)
4. [Data Pipeline](#data-pipeline)
5. [Alert System](#alert-system)
6. [Constants & Configuration Reference](#constants--configuration-reference)

---

## Risk Analysis Engine

**Source:** `server/src/services/riskEngine.js`

The risk engine assigns every asteroid a score from **1 to 100** using a weighted formula that considers four factors.

### Formula

$$
\text{Score} = (H \times 0.40) + (D \times 0.25) + (P \times 0.25) + (V \times 0.10)
$$

Where:

| Symbol | Factor          | Weight | Description                                                                           |
| ------ | --------------- | ------ | ------------------------------------------------------------------------------------- |
| $H$    | Hazard Status   | 40%    | Whether NASA classifies the asteroid as "potentially hazardous" (100 if yes, 0 if no) |
| $D$    | Diameter Score  | 25%    | Size-based threat level using logarithmic scaling                                     |
| $P$    | Proximity Score | 25%    | How close the asteroid comes to Earth (closer = higher)                               |
| $V$    | Velocity Score  | 10%    | Relative approach speed                                                               |

### Diameter Score (Logarithmic)

Small asteroids are extremely common; large ones are rare but far more destructive. A logarithmic scale captures this:

$$
D = \frac{\log_{10}(\text{diameter in meters})}{\log_{10}(1000)} \times 100
$$

**Examples:**

| Diameter | Score        |
| -------- | ------------ |
| 10 m     | ~33          |
| 100 m    | ~67          |
| 500 m    | ~90          |
| 1000 m+  | 100 (capped) |

The `MAX_DIAMETER` constant is set to **1000 meters**. Anything larger receives the maximum score. This threshold was chosen because asteroids >1 km have civilization-threatening potential.

### Proximity Score (Inverse Distance)

Closer approaches are more dangerous. The score uses linear interpolation between two boundaries:

$$
P = \frac{D_{\max} - d}{D_{\max} - D_{\min}} \times 100
$$

Where:

- $d$ = miss distance in Lunar Distances (LD)
- $D_{\min}$ = 1 LD (very close — inside the Moon's orbit)
- $D_{\max}$ = 50 LD (beyond this, risk is negligible)

**Special cases:**

- $d \leq 1\text{ LD}$ → Score = 100
- $d \geq 50\text{ LD}$ → Score = 0
- $d$ unknown or zero → Score = 100 (worst-case assumption)

> **Note:** 1 Lunar Distance ≈ 384,400 km. Earth's Hill sphere (gravitational sphere of influence) extends to ~1.5 million km (~3.9 LD).

### Velocity Score (Linear)

Higher velocity means higher kinetic energy at impact:

$$
V = \frac{v}{V_{\max}} \times 100
$$

Where $V_{\max} = 30\text{ km/s}$ — a typical high-speed NEO encounter. Values above this are capped at 100.

### Risk Categories

| Score Range | Category | Color     | Meaning                                           |
| ----------- | -------- | --------- | ------------------------------------------------- |
| 1–25        | Minimal  | 🟢 Green  | No significant threat. Standard monitoring.       |
| 26–50       | Low      | 🟡 Yellow | Minor concern. Continued observation recommended. |
| 51–75       | Moderate | 🟠 Orange | Notable approach. Enhanced monitoring advised.    |
| 76–100      | High     | 🔴 Red    | Significant concern. Close observation required.  |

### Example Calculation

Consider asteroid **2024 ABC**:

- Potentially hazardous: **Yes** → $H = 100$
- Estimated diameter: **200 m** → $D = \frac{\log_{10}(200)}{\log_{10}(1000)} \times 100 = \frac{2.301}{3} \times 100 ≈ 76.7$
- Miss distance: **10 LD** → $P = \frac{50 - 10}{50 - 1} \times 100 ≈ 81.6$
- Velocity: **18 km/s** → $V = \frac{18}{30} \times 100 = 60$

$$
\text{Score} = (100 \times 0.40) + (76.7 \times 0.25) + (81.6 \times 0.25) + (60 \times 0.10)
$$

$$
= 40 + 19.2 + 20.4 + 6.0 = \mathbf{85.6} \rightarrow \text{High Risk} 🔴
$$

---

## Orbital Mechanics & Visualization

The 3D view (dashboard globe and **3D View** page) is a real-time, geocentric
model built from real ephemerides. Nothing is decorative.

### Asteroid trajectories (JPL orbital elements)

1. After every NASA sync the server calls the NeoWs **lookup** endpoint for each
   new asteroid and stores its JPL osculating elements
   (`a, e, i, Ω, ω, M₀, n, epoch`) plus orbit class, MOID, period and the
   observation arc (`server/src/services/orbitService.js`, `enrichOrbits()`).
2. The client propagates the asteroid **and** Earth as two-body Kepler orbits
   (Earth: Standish/JPL approximate elements) and subtracts them:
   `r_geo(t) = r_ast,helio(t) − r_earth,helio(t)` (`client/src/utils/ephemeris.js`).
3. **Validation.** At NASA's close-approach time the model reproduces NASA's
   published miss distance and relative speed. For the October 2026 sample,
   70 of 72 objects agree within ±5 % on distance, and speeds agree to 0.1 km/s.
   The ratio is stored as `orbit.fidelity`.
4. **Anchoring.** Positions are scaled by `1 / fidelity`, so the drawn closest
   approach lands exactly on NASA's value. If fidelity is worse than ±15 %
   (e.g. a 16-year-old orbit epoch), the path falls back to a straight-line
   flyby through NASA's miss distance and speed, oriented by the JPL-derived
   approach direction. The info panel states which model is used.
5. Approaching / receding status follows NASA's (n-body) close-approach time,
   with "at closest approach" within ±3 h.

### Earth, Sun and Moon

| Body | Method | Accuracy |
|---|---|---|
| Earth rotation | Greenwich Mean Sidereal Time; axis tilted 23.44° to the ecliptic | sub-degree |
| Sun direction | Negated Earth heliocentric position | ≈ 1′ |
| Moon | Low-precision lunar theory (Astronomical Almanac) | ≈ 0.3°, distance ±0.1 % |

Validated: at the 2026 solstices the subsolar point is at ±23.44° latitude,
and on 6 Oct 2026 06:00 UTC it is at 5.0° S, 86.7° E (expected ≈ 5° S, 87° E).

### Scene scale

Directions are true; distances are compressed logarithmically so a geostationary
satellite and an asteroid at 200 LD fit in one view:

```
R_scene = 2 · (1 + 3.1 · log10(r_km / 6371))      (Earth radius = 2 units)
```

Reference rings mark GEO (42,164 km), 1 LD (Moon), 10, 50 and 200 LD. Frame:
ecliptic J2000 with ecliptic north up.

### Interaction

- Time slider ±7 days, with playback from 30 min/s up to 1 day/s. At 0 the
  view is live, and bodies move in real time.
- Click an asteroid (or pick it from the list) to get live distance, phase,
  closest-approach countdown, miss distance, size comparison, risk, JPL orbit
  (class, a/e/i, MOID, period, observation arc) and "Jump to closest approach".
- Deep link: `/visualization?focus=<neo_reference_id>`.

---

## Impact Physics Simulator

**Source:** `client/src/components/Visualization/ImpactSimulator.jsx`

The impact visualizer lets users simulate hypothetical asteroid impacts by adjusting diameter, velocity, density, and impact angle.

### Kinetic Energy

$$
E_k = \frac{1}{2} m v^2
$$

Where:

- $m = \rho \cdot \frac{4}{3}\pi r^3$ (mass from density and volume of a sphere)
- $v$ = velocity in m/s
- $\rho$ = density in kg/m³ (user-adjustable; default ~3000 kg/m³ for rocky asteroids)

Energy is converted to **megatons of TNT** equivalent:

$$
E_{\text{MT}} = \frac{E_k}{4.184 \times 10^{15}}
$$

### Crater Diameter

Using a simplified scaling law derived from impact crater research:

$$
D_{\text{crater}} = 0.07 \times E_k^{0.29} \times (\sin\alpha)^{0.33}
$$

Where $\alpha$ is the impact angle from horizontal. Steeper impacts create larger craters.

### Earthquake Magnitude

Based on energy-magnitude relationships:

$$
M_w = \min\left(10,\; 0.67 \log_{10}(E_{\text{MT}}) + 5.87\right)
$$

Capped at 10 (theoretical maximum for any seismic event).

### Fireball Radius

$$
R_{\text{fireball}} = 1.2 \times E_{\text{MT}}^{0.4} \text{ km}
$$

### Ejecta Height

$$
H_{\text{ejecta}} = \min(100,\; D_{\text{crater}} \times 2.5) \text{ km}
$$

Capped at 100 km (edge of space).

### Human-Readable Comparisons

The simulator maps energy output to recognizable reference points:

| Energy (Megatons) | Comparison                                         |
| ----------------- | -------------------------------------------------- |
| < 0.001           | Large conventional bomb                            |
| 0.001–0.02        | Hiroshima bomb (~15 kT)                            |
| 0.02–1            | Modern nuclear warhead                             |
| 1–100             | Tsar Bomba (~50 MT)                                |
| 100–10,000        | Small extinction event                             |
| 10,000–1,000,000  | Regional extinction event                          |
| 1M–1B             | Chicxulub-class (dinosaur killer, ~100 million MT) |
| > 1B              | Planet-shattering cataclysm                        |

---

## Data Pipeline

### How NASA Data Flows Through the System

```
NASA NeoWs API
     │
     ▼
nasaService.js ─── Fetches NEO feed / lookups, records latency + rate-limit headers
     │
     ▼
cacheService.js ─── Redis (or in-memory) cache: feed 1h, lookups 6h
     │
     ▼
scheduler.js ─── Cron jobs + on-demand date-range syncs
     │
     ▼
riskEngine.js ─── Calculates risk score for each asteroid
     │
     ▼
MongoDB ─── Upserts asteroids with risk data (TTL: CACHE_RETENTION_DAYS, default 30)
     │
     ▼
alertDispatcher.js ─── Matches against user thresholds
     │
     ▼
Socket.IO ─── Real-time notifications to connected clients
```

### Scheduler Timing

| Job            | Schedule (UTC)           | Description                                         |
| -------------- | ------------------------ | --------------------------------------------------- |
| Daily fetch    | Every day at 00:01       | Fetches today's close approaches                    |
| 7-day fetch    | Every day at 00:30       | Fetches the rolling next 7 days                     |
| Alert check    | Every 6 hours + after fetches | Scans upcoming approaches against user preferences |
| Initial fetch  | On server startup        | Loads the 7-day window so the DB isn't empty after a cold start |
| Range sync     | On demand                | `POST /api/asteroids/sync-range` backfills any ≤7-day window (Date Range Picker) |

### Caching Layers

| Layer | What | TTL |
| ----- | ---- | --- |
| Redis / memory | NASA feed responses (`nasa:feed:*`) | 1 hour |
| Redis / memory | NASA single-asteroid lookups (`nasa:neo:*`) | 6 hours |
| Redis / memory | `/stats`, `/featured`, `/analytics` responses (`api:*`) | 2–10 min, cleared after every sync |
| MongoDB | Asteroid documents | `CACHE_RETENTION_DAYS` (default 30) |

Redis is used when `REDIS_URL` is set; otherwise an in-process memory cache is used, so the
server runs anywhere without extra infrastructure.

---

## Alert System

**Source:** `server/src/services/alertDispatcher.js`

### How Alerts Work

1. After each data fetch, the alert dispatcher finds all asteroids approaching within N days.
2. For each approaching asteroid, it finds users who are watching it or whose alert thresholds match.
3. A threshold match checks three user-configurable settings:
   - **Minimum diameter** — only alert for asteroids above this size.
   - **Maximum distance** — only alert for approaches closer than this (in Lunar Distances).
   - **Risk threshold** — only alert when the risk score exceeds this value.
4. If an alert hasn't already been sent for this asteroid + user combination in the last 24 hours, a new alert is created and dispatched.

### Alert Types

| Type             | Trigger                                                      |
| ---------------- | ------------------------------------------------------------ |
| `close_approach` | Asteroid is approaching within the user's distance threshold |
| `high_risk`      | Asteroid's risk score exceeds the user's threshold           |
| `watched_update` | An asteroid on the user's watchlist has new data             |
| `new_hazardous`  | A new potentially hazardous asteroid is detected             |

### Alert Severity

| Severity  | Derived From                                 |
| --------- | -------------------------------------------- |
| `info`    | Standard approach notifications              |
| `warning` | Moderate risk or closer-than-usual approach  |
| `danger`  | High risk asteroids or very close approaches |

### Delivery Channels

Alerts are delivered via:

- **Dashboard** — In-app notification badge and alerts page.
- **Socket.IO** — Real-time toast notification pushed to connected clients.
- **Email** — (Configurable, via user settings).

---

## Constants & Configuration Reference

### Risk Engine Constants

| Constant                  | Value   | Purpose                                            |
| ------------------------- | ------- | -------------------------------------------------- |
| `MAX_DIAMETER`            | 1000 m  | Diameter score cap — asteroids ≥1 km get max score |
| `MAX_VELOCITY`            | 30 km/s | Velocity score cap — typical high-speed NEO        |
| `MIN_SAFE_DISTANCE`       | 1 LD    | Anything closer scores 100 (inside Moon's orbit)   |
| `MAX_CONCERNING_DISTANCE` | 50 LD   | Anything farther scores 0                          |

### Visualization Constants

| Constant          | Value            | Purpose                                        |
| ----------------- | ---------------- | ---------------------------------------------- |
| `AU_KM`           | 149,597,870.7 km | 1 Astronomical Unit                            |
| `EARTH_RADIUS_KM` | 6,371 km         | Earth mean radius                              |
| `LUNAR_DISTANCE_KM` | 384,400 km     | 1 LD (mean Earth–Moon distance)                |
| `EARTH_SCENE_RADIUS` | 2             | Earth model radius in scene units              |
| `LOG_K`           | 3.1              | Logarithmic distance compression factor        |
| `OBLIQUITY`       | 23.4393°         | Earth axial tilt (equatorial ↔ ecliptic)       |

### Impact Simulator Defaults

| Parameter    | Default Range | Unit    |
| ------------ | ------------- | ------- |
| Diameter     | 0.01–100      | km      |
| Velocity     | 1–72          | km/s    |
| Density      | 1000–8000     | kg/m³   |
| Impact Angle | 5–90          | degrees |

### Key Conversions

| Conversion                     | Value               |
| ------------------------------ | ------------------- |
| 1 Lunar Distance (LD)          | 384,400 km          |
| 1 AU                           | 149,597,870.7 km    |
| 1 Megaton TNT                  | 4.184 × 10¹⁵ joules |
| Earth's escape velocity        | 11.186 km/s         |
| Typical NEO encounter velocity | 10–25 km/s          |

---

_For implementation details, see the source files referenced in each section._
