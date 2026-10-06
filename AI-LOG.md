# AI Development Log — Astral NEO Monitoring Platform

This document chronicles how AI (GitHub Copilot / LLM-assisted development) was used throughout the design, development, and deployment of the Astral project. It serves as both a transparency record and a practical guide for developers interested in AI-augmented workflows.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [AI Tools Used](#ai-tools-used)
3. [Phase-by-Phase Breakdown](#phase-by-phase-breakdown) (incl. Phase 6 — consolidation & deployment)
4. [What AI Did Well](#what-ai-did-well)
5. [Where Human Judgment Was Essential](#where-human-judgment-was-essential)
6. [Prompting Strategies](#prompting-strategies)
7. [Lessons Learned](#lessons-learned)
8. [How to Reproduce This Workflow](#how-to-reproduce-this-workflow)

---

## Project Overview

**Astral** is a full-stack Near-Earth Object (NEO) monitoring platform featuring real-time NASA data ingestion, a custom risk-analysis engine, 3D orbital visualization, real-time chat, and a user alert system. The tech stack includes:

| Layer        | Technology                                                                         |
| ------------ | ---------------------------------------------------------------------------------- |
| Frontend     | React 19, Vite, Tailwind CSS, Three.js (React Three Fiber), Zustand, Framer Motion |
| Backend      | Node.js, Express, Socket.IO, Mongoose                                              |
| Database     | MongoDB 7                                                                          |
| DevOps       | Docker, Docker Compose, Nginx                                                      |
| External API | NASA NeoWs (Near Earth Object Web Service)                                         |

The entire project was built with significant AI assistance. This log documents exactly what AI contributed, what required human judgment, and the prompting strategies that produced the best results.

---

## AI Tools Used

| Tool                   | Role                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| **GitHub Copilot**     | Inline code completions, Chat for architecture decisions, debugging, and code generation directly in VS Code. |
| **Claude (Anthropic)** | Longer-form planning, complex multi-file refactors, documentation drafting, and technical decision analysis.  |

Both tools were used conversationally — not just as autocomplete. Prompts ranged from single-line completions to multi-paragraph architectural briefs.

---

## Phase-by-Phase Breakdown

### Phase 1 — Infrastructure & Database

**What AI helped with:**

- **Docker Compose scaffolding** — Generated `docker-compose.yml` with MongoDB 7, Mongo Express, networking, volumes, and authentication configuration from a single prompt describing the desired dev environment.
- **Database initialization** — Wrote the `mongo-init/01-create-app-user.js` script that bootstraps a dedicated application-level MongoDB user on first container launch.
- **Mongoose schemas** — Generated `Asteroid.js`, `User.js`, `Alert.js`, and `ChatMessage.js` models with proper indexing, TTL expiry (24h for asteroid data), validation rules, and static methods.
- **Express server boilerplate** — Scaffolded `app.js` with CORS configuration, JSON body parsing, health check endpoint, route wiring, and Socket.IO initialization.

**Prompting approach:**

> "Set up a Docker Compose file for a MongoDB 7 database with authentication, a Mongo Express UI for development, and a network that the backend can join later. Include persistent volumes and an init script to create an application user."

**Human decisions:**

- Choosing MongoDB over PostgreSQL for flexible schema and TTL-based auto-expiry of stale asteroid data.
- Defining the data model boundaries — deciding what to cache from NASA vs. compute on the fly.
- Setting TTL duration (24 hours) based on how frequently NASA updates NEO data.

---

### Phase 2 — NASA Integration & Risk Engine

**What AI helped with:**

- **NASA API service** (`nasaService.js`) — Generated the complete wrapper around NASA's NeoWs REST API with error handling, date formatting, pagination, and both daily and weekly fetch functions.
- **Risk Analysis Engine** (`riskEngine.js`) — Implemented the entire weighted scoring system from a natural language description of the desired formula. AI produced the logarithmic diameter scaling, inverse distance scoring, velocity normalization, and risk categorization functions.
- **Scheduler service** (`scheduler.js`) — Built the `node-cron`-based scheduler that runs daily/weekly data fetches, processes asteroids through the risk engine, and stores results with upsert logic.
- **Alert dispatcher** (`alertDispatcher.js`) — Created the service that matches asteroid events against user-defined thresholds and dispatches real-time Socket.IO notifications, including duplicate alert prevention.

**Prompting approach:**

> "Build a risk scoring engine that weighs hazard status (40%), diameter (25%), proximity (25%), and velocity (10%) on a 1–100 scale. Use logarithmic scaling for diameter since small asteroids are common but large ones are rare and dangerous. Use inverse distance scoring where closer = higher risk. Categorize: 1-25 minimal, 26-50 low, 51-75 moderate, 76-100 high."

**Human decisions:**

- Tuning the risk formula weights (40/25/25/10) after manual review of NASA's actual hazardous object list.
- Setting normalization constants — `MAX_DIAMETER = 1000m`, `MAX_CONCERNING_DISTANCE = 50 lunar distances` — based on research of real NEO data distributions.
- Choosing daily + weekly fetch cadence to balance API rate limits with data freshness.

---

### Phase 3 — Authentication & API Routes

**What AI helped with:**

- **JWT authentication middleware** — Generated `auth.js` and `adminAuth.js` middleware with token verification, user lookup, and role-based access control.
- **RESTful route scaffolding** — All five route files (`asteroidRoutes.js`, `authRoutes.js`, `alertRoutes.js`, `chatRoutes.js`, `adminRoutes.js`) were generated with proper validation, pagination, error responses, and protected route decorators.
- **Watchlist feature** — Implemented add/remove/list endpoints for per-user asteroid watchlists.
- **Socket.IO auth flow** — Built JWT verification on WebSocket connection handshake, room-based user channels, and reconnection handling.

**Prompting approach:**

> "Generate Express routes for the asteroid API. Include: list with filters (name search, hazardous-only, risk category, date range, pagination), stats endpoint returning counts and averages, today's approaches, single asteroid detail, and hazardous-only listing. Use the auth middleware for protected routes."

**Human decisions:**

- Choosing bcryptjs over argon2 for password hashing (simpler native dependency story for Docker Alpine images).
- Designing the alert severity model (info / warning / danger).
- API rate limiting strategy and CORS policy.

---

### Phase 4 — Frontend & 3D Visualization

**What AI helped with:**

- **React project scaffolding** — Set up the Vite project with Tailwind CSS, React Router, and the full page/component structure.
- **State management** — Generated all four Zustand stores (`authStore.js`, `asteroidStore.js`, `alertStore.js`, `chatStore.js`) with API integration, optimistic updates, and persistence.
- **3D Earth visualization** — Built the React Three Fiber scene with Earth textures, atmosphere shader, star field, camera controls, and the sun clock (day/night terminator).
- **Orbital mechanics module** (`orbitalMechanics.js`) — AI generated the orbit estimator that derives elliptical orbits from close-approach data, the Kepler's equation solver (Newton-Raphson), and the orbit point renderer.
- **Impact simulator** (`ImpactSimulator.jsx`) — Generated the physics estimation function (kinetic energy, crater diameter, earthquake magnitude, fireball radius) and the 3D impact visualization with custom GLSL shaders.
- **Reusable UI components** — `AsteroidCard`, `SearchModal`, `Toast`, `LoadingScreen`, `ErrorBoundary`, `StatCard`, `Ticker` — all generated from descriptive prompts and styled with Tailwind.

**Prompting approach:**

> "Create a Three.js orbital mechanics module that: (1) estimates an elliptical orbit from asteroid close-approach data (miss distance, velocity, hazardous flag) when full Keplerian elements aren't available, (2) generates an array of Vector3 points tracing the orbit, (3) solves Kepler's equation iteratively to get position at any given time. Use deterministic seeded randomness for orientation so the same asteroid always renders the same orbit."

**Human decisions:**

- Choosing the visual compression scale factor (`VIS_SCALE = 0.00004`) so orbits look compelling on screen.
- UX flow for the watchlist, alert preferences, and chat sidebar.
- Color palette and risk-category visual language (green → yellow → orange → red).
- Animation timing, camera positions, and interaction design.

---

### Phase 5 — Real-Time Features

**What AI helped with:**

- **Socket.IO chat system** — Implemented client/server real-time chat with message persistence in MongoDB, typing indicators, and message history loading.
- **Real-time alert pipeline** — Built the full chain: scheduler → risk engine → alert dispatcher → Socket.IO broadcast → frontend toast notifications.
- **Client socket service** (`socket.js`) — Generated the connection management module with reconnection logic, event subscription/unsubscription, and cleanup handlers.

**Human decisions:**

- Limiting chat history fetch depth for performance.
- Choosing polling + WebSocket transport fallback for Socket.IO in production.
- Notification UX (toast duration, stacking behavior).

---

### Phase 6 — Docker & Deployment

**What AI helped with:**

- **Multi-stage Dockerfiles** — Both client (Vite build → Nginx serve) and server (dependency install → lean production image with non-root user) Dockerfiles were AI-generated.
- **Nginx configuration** — Generated `nginx.conf` that reverse-proxies `/api` and `/socket.io` to the backend container, enables gzip compression, caches static assets, and handles SPA routing fallback.
- **Production Docker Compose** (`docker-compose.prod.yml`) — Generated with resource limits, restart policies, environment variable injection, and build arguments.
- **Vercel configuration** — Generated `vercel.json` for optional serverless frontend deployment.

**Prompting approach:**

> "Write a multi-stage Dockerfile for the Vite React app: stage 1 builds with Node 20-alpine, stage 2 serves with nginx:alpine. Include a custom nginx config that proxies /api and /socket.io to a 'backend' Docker service on port 5000, with WebSocket upgrade support."

**Human decisions:**

- Running the backend as a non-root user (`astral`) inside the container.
- Setting Docker health checks and restart policies.
- Memory limits (512MB backend, 128MB frontend, 512MB MongoDB).

---

## Phase 6 — Consolidation, Feature Completion & Cloud Deployment

**Tool:** Claude Code (Anthropic) working directly in the repository.

The project previously lived in three repositories (`Astro-Tracker` monorepo, `astro-tracker-client`,
`astro-tracker-server`). They were merged into a single monorepo: the server was identical in both
places, while the standalone client carried newer responsive-layout work, so its `src/` was taken
over the monorepo copy.

### Gap analysis against the ASTRAL specification → implemented

| Spec item | Change |
|---|---|
| Redis caching | `cacheService.js` — Redis when `REDIS_URL` is set, in-memory fallback; NASA feed/lookup responses and hot endpoints cached |
| Sort & filter bar / date range picker | `/api/asteroids` gained date, size, velocity, distance and search filters; `POST /sync-range` backfills any ≤7-day window from NASA |
| Live countdown timers | `Countdown` HUD component on cards, detail page and featured object |
| Asteroid of the Day | `/api/asteroids/featured` + dashboard card with selection reasons |
| Risk charts & scatter plot | `/api/asteroids/analytics` + Analytics page (Recharts); palette validated for colour-vision deficiency on the dark surface |
| Approach history timeline | `/api/asteroids/:id/history` (NASA lookup) + timeline component |
| Admin alert dispatch | `Broadcast` model, `POST /api/admin/broadcast`, global `ADMIN_BROADCAST` banner |
| System health console | `/api/admin/health` — NASA latency & rate-limit headers, DB ping, cache hit rate, sockets |
| Role management | `ADMIN_EMAILS` bootstrap + admin user/role endpoints and UI |
| Localization | i18next with English, Hindi, Odia and Spanish |
| Security | Helmet, express-rate-limit, JWT-verified socket user rooms |

### Bugs found and fixed during review

- Any client could join any user's private socket room by sending that user's id — now requires the JWT.
- The dev `docker-compose.yml` never passed `JWT_SECRET`, so login crashed inside Docker.
- `VITE_API_URL=""` (Docker same-origin mode) fell back to `http://localhost:5000` because of `||`.
- A failed login (401) triggered a full page reload, hiding the error message.
- Socket listeners registered by child components before the socket existed were silently dropped.
- Asteroid list could skip page 1 when filters changed while a request was in flight.
- Asteroid detail read `absoluteMagnitudeH` while the model stores `absolute_magnitude_h`.
- Asteroid records expired after 24 h while only "today" was fetched on boot — free-tier restarts
  left the feed nearly empty. Startup now loads the 7-day window and retention is configurable.

### Deployment

- `render.yaml` Blueprint for the API (+ Render Key Value for Redis), Vercel for the SPA.
- Route-level code splitting cut the initial bundle from ~2 MB to ~470 KB (Three.js and charts load on demand).

---

## What AI Did Well

| Area                         | Details                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Boilerplate elimination**  | Express server setup, Mongoose schemas, route scaffolding, Docker configs — AI generated correct, production-quality boilerplate in seconds.                 |
| **Algorithm implementation** | The risk scoring formula, Kepler's equation solver, impact physics estimator, and orbital mechanics math were generated accurately from descriptive prompts. |
| **Cross-file consistency**   | When the data model changed, AI helped propagate updates across models, routes, services, and frontend stores simultaneously.                                |
| **Documentation**            | README files, JSDoc comments, and inline documentation were drafted by AI and refined by hand.                                                               |
| **Debugging**                | AI identified CORS issues, Socket.IO connection race conditions, and MongoDB auth problems from error messages alone.                                        |
| **Shader code**              | GLSL shaders for the atmosphere effect and impact visualization were generated with correct uniforms and fragment math.                                      |

---

## Where Human Judgment Was Essential

| Area                    | Details                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**        | Deciding on the service layer pattern, choosing Zustand over Redux, selecting MongoDB — these required understanding trade-offs AI couldn't fully evaluate.     |
| **Risk formula tuning** | The weight percentages (40/25/25/10) and normalization thresholds were calibrated against real NASA data — AI provided the framework, humans tuned the numbers. |
| **UX & design**         | Layout decisions, color choices, animation timing, and user flow design were human-driven.                                                                      |
| **Security review**     | JWT secret management, CORS policy, rate limiting decisions, and input validation rules were manually reviewed.                                                 |
| **Performance**         | Knowing when to add database indexes, when to use TTL expiry, and how to structure Socket.IO rooms required domain experience.                                  |
| **Scientific accuracy** | Verifying that the impact physics formulas produced reasonable real-world values (cross-referenced with published research).                                    |

---

## Prompting Strategies

### What Worked Well

1. **Describe the goal, not the code** — _"Build a risk scoring engine that weighs hazard status, size, proximity, and velocity on a 1–100 scale"_ produced better results than asking for specific function signatures.

2. **Provide context first** — Sharing the Mongoose schema before asking for route handlers ensured AI generated correct field references immediately.

3. **Iterate in small steps** — Building the orbital mechanics module in stages (constants → orbit estimation → point generation → Kepler solver) kept each interaction focused and accurate.

4. **Ask for alternatives** — _"What are 3 ways to handle real-time asteroid alerts?"_ surfaced options (polling, SSE, WebSocket) before committing to Socket.IO.

5. **Review and refine** — AI-generated code was never shipped without reading and understanding it. Every function was tested and adjusted.

6. **Use the right tool for the job** — Quick completions with Copilot inline, architectural discussions with Copilot Chat, complex multi-file refactors with Claude.

### What Didn't Work

1. **Vague prompts** — _"Make the visualization better"_ produced generic suggestions. Specific prompts like _"Add a logarithmic distance scale with labeled grid lines"_ were far more useful.

2. **Multi-concern prompts** — Asking AI to simultaneously design a database schema, write API routes, and create frontend components in one prompt led to shallow results in each area.

3. **Blindly trusting output** — Early on, accepting AI-generated Three.js code without verifying coordinate systems led to orbits rendering in the wrong plane. Lesson: always understand the math.

---

## Lessons Learned

1. **AI is a force multiplier, not a replacement.** The project was completed significantly faster with AI assistance, but every architectural decision, formula calibration, and deployment configuration was human-validated.

2. **Understanding the generated code is non-negotiable.** AI-generated orbital mechanics code contained correct math, but without understanding Kepler's equation, debugging edge cases (e.g., near-circular orbits where eccentricity → 0) would have been impossible.

3. **AI excels at translating requirements into code** when given clear, specific, well-scoped requirements. The quality of the output directly mirrors the quality of the input.

4. **Documentation is nearly free with AI.** JSDoc comments, README files, and this very log were drafted in minutes. The time saved on documentation alone justified the AI-assisted workflow.

5. **Version control discipline matters more with AI.** Since AI can generate large volumes of code quickly, committing frequently and reviewing diffs carefully prevents subtle bugs from accumulating.

6. **The human + AI loop is the sweet spot.** The fastest progress happened when: human defines the goal → AI generates a first draft → human reviews, spots issues, and refines the prompt → AI iterates. This loop often completed features in a fraction of the time pure manual coding would take.

---

## How to Reproduce This Workflow

If you want to build a project using a similar AI-assisted approach:

1. **Plan the architecture first.** Sketch out services, data models, and component hierarchy on paper or in a doc before writing any code.

2. **Break work into phases.** Infrastructure → Data layer → Backend logic → Frontend → Real-time features → Deployment. Each phase is a self-contained prompt context.

3. **Feed AI the right context.** Before asking for route handlers, paste the relevant Mongoose schema into the chat. Before asking for frontend API calls, share the backend route signatures.

4. **One concern per prompt.** Don't ask for a database schema AND API routes AND frontend components in one shot. Focus on one layer at a time.

5. **Verify everything.** Run the code. Test edge cases. Check the math. AI can be confidently wrong — your job is to catch it.

6. **Commit often.** After each AI-generated feature is tested and working, commit immediately. This creates clear rollback points if a subsequent generation breaks something.

7. **Document as you go.** Ask AI to write JSDoc comments and README sections while the context is fresh. It's nearly free and your future self will thank you.

---

_This log was written with AI assistance and reviewed for accuracy by the project author._
