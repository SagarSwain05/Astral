# ASTRAL — Advanced Space Trajectory & Risk Analysis Layer

**National-level Near-Earth Object (NEO) defense & monitoring platform.**

ASTRAL pulls live asteroid data from NASA's NeoWs API and turns it into risk scores,
alerts and visualizations that non-specialists can read: a 0–100 Risk Engine, a 3D
orrery, a kinetic impact simulator, live discussion rooms, and an admin console for
dispatching national "Red Alerts".

**Live:** web — https://astral-neo.vercel.app · API — https://astral-api-kwt0.onrender.com

| | |
|---|---|
| **Frontend** | React 19 (Vite), Tailwind CSS, Lucide, Three.js / React Three Fiber, Recharts, i18next |
| **Backend** | Node.js, Express, Socket.IO, node-cron |
| **Data** | MongoDB (Mongoose), Redis cache (optional, in-memory fallback) |
| **DevOps** | Docker multi-stage builds, Docker Compose, Render (API), Vercel (web) |

---

## Feature Map

### Phase 1 — Core Systems & Security
- **Role-based JWT auth** — `user` (public), `researcher`, `admin` (Gov). Admins are bootstrapped with `ADMIN_EMAILS` and can change roles from the Admin Console.
- **Personal watchlist** — bookmark NEOs, synced live over Socket.IO.
- **Smart alerts** — per-user thresholds (min diameter, max distance, min risk score); matching approaches create alerts and push them in real time.
- **User dashboard** — profile, alert history, watchlist, settings.
- **Hardening** — Helmet headers, per-IP rate limiting (stricter on login/register), CORS allow-list in production, socket user rooms gated by JWT.

### Phase 2 — Intelligence Dashboard
- **Real-time NEO feed** — NASA NeoWs auto-sync (daily + rolling 7-day cron, startup fetch) with **Redis caching**.
- **Risk Score Engine** — weighted 0–100 score from hazard flag, size, distance, velocity (see [GUIDE.md](GUIDE.md)).
- **Sort & filter bar** — hazardous, risk category, size, speed, distance, name search, sort by any metric.
- **Date range picker** — browse any past/future window; missing windows are pulled from NASA on demand.
- **Live countdown timers** — T-minus to closest approach on every card, detail page and the featured object.
- **Asteroid of the Day** — server-selected most notable approach, with reasons.
- **Analytics** — risk distribution, daily approaches (stacked hazardous / non-hazardous), speed-vs-distance scatter, size histogram, table view.

### Phase 3 — Visualization & Simulation
- **3D orbital orrery** — interactive Earth + NEO orbits (Kepler solver), time controls, sun clock.
- **Kinetic impact simulator** — energy (megatons), crater, fireball, seismic magnitude.
- **Size comparison** — diameter vs. cars, football fields, Eiffel Tower, Burj Khalifa…
- **Approach history timeline** — every recorded past & predicted Earth pass for an asteroid.

### Phase 4 — Community & Governance
- **Real-time intel chat** — Socket.IO rooms per asteroid + global channel.
- **Admin alert dispatch** — broadcast info / warning / red alerts (simulation or live) to every connected client.
- **System health console** — NASA latency & rate-limit remaining, DB ping, cache hit rate, connected clients, active users.
- **Localization (i18n)** — English, हिन्दी, ଓଡ଼ିଆ, Español (navigation, dashboard, analytics, admin, timelines).

---

## Architecture

```
            ┌──────────────────────── Vercel ────────────────────────┐
 Browser ──▶│  React SPA (Vite build)                                │
            └───────────┬───────────────────────────────┬────────────┘
                        │ REST /api/*                   │ WebSocket /socket.io
            ┌───────────▼──────────── Render ───────────▼────────────┐
            │  Express API + Socket.IO  ──cron──▶ NASA NeoWs API      │
            │        │            │                                   │
            │   MongoDB Atlas   Redis (Render Key Value, optional)    │
            └─────────────────────────────────────────────────────────┘
```

With Docker Compose the same pieces run locally, and nginx in the frontend container proxies
`/api` and `/socket.io` to the backend (same origin, no CORS).

---

## Project Structure

```
/
├── client/                      # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Visualization/   # Three.js: Earth3D, AsteroidOrbit, ImpactSimulator…
│   │   │   ├── hud/             # Countdown, AsteroidOfTheDay, ApproachTimeline
│   │   │   ├── shared/          # BroadcastBanner, LanguageSwitcher
│   │   │   ├── Asteroid/ Chat/ Dashboard/ Layout/ Common/ Auth/
│   │   ├── i18n/                # i18next setup + locales (en, hi, or, es)
│   │   ├── pages/               # Dashboard, AsteroidList, AsteroidDetail, Analytics,
│   │   │                        # AdminConsole, Visualization, ImpactVisualizer, …
│   │   ├── services/            # Axios API client, Socket.IO client
│   │   ├── stores/              # Zustand stores (auth, asteroids, alerts, chat)
│   │   └── utils/               # Orbital mechanics
│   ├── Dockerfile · nginx.conf · vercel.json
├── server/                      # Node.js backend
│   ├── src/
│   │   ├── config/              # MongoDB connection
│   │   ├── middleware/          # JWT auth, admin guard
│   │   ├── models/              # User, Asteroid, Alert, ChatMessage, Broadcast
│   │   ├── routes/              # asteroids, auth, alerts, chat, admin
│   │   ├── services/            # nasaService, cacheService, riskEngine, scheduler, alertDispatcher
│   │   └── app.js               # Express + Socket.IO entry point
│   ├── postman/                 # Postman collection + local environment
│   └── Dockerfile
├── mongo-init/                  # Creates the app DB user on first Docker launch
├── docker-compose.yml           # Dev stack: Mongo, Redis, Mongo Express, API, web
├── docker-compose.prod.yml      # Production stack
├── render.yaml                  # Render Blueprint (API + Redis)
├── Astral_Postman_Collection.json
├── GUIDE.md                     # Risk math, orbital mechanics, impact physics, pipeline
├── AI-LOG.md                    # AI assistance log
└── docs/                        # Presentation deck
```

---

## Run Locally

### Option A — Docker (everything in one command)

```bash
cp .env.example .env            # optional: set NASA_API_KEY, ADMIN_EMAILS
docker compose up --build
```

| Service | URL |
|---|---|
| App | http://localhost |
| API | http://localhost:5000 |
| Mongo Express | http://localhost:8081 (admin / admin123) |

### Option B — Node directly

Prerequisites: Node.js 20.19+ and MongoDB (local or Atlas). Redis is optional.

```bash
# 1. Backend
cd server
cp .env.example .env            # set MONGODB_URI, JWT_SECRET, NASA_API_KEY, ADMIN_EMAILS
npm install
npm run dev                     # http://localhost:5000

# 2. Frontend (new terminal)
cd client
cp .env.example .env            # VITE_API_URL / VITE_SOCKET_URL → http://localhost:5000
npm install
npm run dev                     # http://localhost:3000
```

**Becoming admin:** put your email in `ADMIN_EMAILS`, register, then restart the server. The
**Admin** tab appears in the navbar.

---

## Deployment (Render + Vercel)

### 1. Database — MongoDB Atlas
Create a free M0 cluster, add a database user, allow network access from `0.0.0.0/0`, and
copy the `mongodb+srv://…` connection string (database name `astral_neo`).

### 2. Backend — Render
Use **New → Blueprint** with this repo (reads `render.yaml`), or create a Web Service manually:

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm ci --omit=dev` |
| Start command | `node src/app.js` |
| Health check | `/health` |

Environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `NASA_API_KEY`,
`CORS_ORIGIN` (your Vercel URL), `ADMIN_EMAILS`, optional `REDIS_URL`.

> Render's free tier sleeps after 15 minutes idle; the first request then takes ~30–60 s.
> The server re-syncs the 7-day NASA window on every boot, so data is fresh after wake-up.

### 3. Frontend — Vercel
Import the repo with **Root Directory = `client`** (framework preset: Vite). Set:

```
VITE_API_URL=https://<your-render-service>.onrender.com
VITE_SOCKET_URL=https://<your-render-service>.onrender.com
```

`client/vercel.json` already rewrites all routes to `index.html` for client-side routing.
Finally add the Vercel URL to `CORS_ORIGIN` on Render.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `NASA_API_KEY` | ⚠️ | Free key from https://api.nasa.gov (`DEMO_KEY` ≈ 30 req/hour) |
| `CORS_ORIGIN` | prod | Comma-separated allowed frontend origins |
| `REDIS_URL` | — | Redis connection string; in-memory cache when unset |
| `ADMIN_EMAILS` | — | Comma-separated emails promoted to admin on boot |
| `PORT` | — | Default `5000` |
| `JWT_EXPIRES_IN` | — | Default `7d` |
| `CACHE_RETENTION_DAYS` | — | Days to keep asteroid records (default 30) |
| `RATE_LIMIT_MAX` | — | Requests per IP per 15 min on `/api` (default 600) |

### Client (`client/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend base URL. Empty string = same origin (Docker/nginx) |
| `VITE_SOCKET_URL` | Socket.IO base URL (usually the same as the API) |

---

## API Reference

Full request examples: [Astral_Postman_Collection.json](Astral_Postman_Collection.json).

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness check |
| GET | `/api/asteroids` | Public | List with filters: `startDate`, `endDate`, `minDiameter`, `maxDiameter`, `minVelocity`, `maxVelocity`, `maxDistance`, `hazardousOnly`, `riskCategory`, `search`, `sortBy`, `order`, `page`, `limit` |
| GET | `/api/asteroids/today` | Public | Today's approaches |
| GET | `/api/asteroids/stats` | Public | Dashboard statistics |
| GET | `/api/asteroids/featured` | Public | Asteroid of the Day |
| GET | `/api/asteroids/analytics` | Public | Chart aggregates (optional date range) |
| POST | `/api/asteroids/sync-range` | Public | Pull a ≤7-day window from NASA |
| GET | `/api/asteroids/:id` | Public | Asteroid detail + size comparison |
| GET | `/api/asteroids/:id/history` | Public | All recorded Earth approaches |
| GET | `/api/asteroids/hazardous/all` | Public | Potentially hazardous asteroids |
| POST | `/api/auth/register` · `/api/auth/login` | Public | Returns JWT |
| GET / PUT | `/api/auth/me` · `/api/auth/profile` | User | Profile & alert thresholds |
| GET / POST / DELETE | `/api/auth/watchlist[/:asteroidId]` | User | Watchlist |
| DELETE | `/api/auth/account` | User | Delete account |
| GET / PUT / DELETE | `/api/alerts…` | User | Alerts, mark read, delete |
| GET | `/api/chat/messages?room=` | Public | Chat history |
| GET | `/api/admin/health` | Admin | System health console |
| POST | `/api/admin/broadcast` | Admin | Dispatch red / warning / info alert |
| GET | `/api/admin/broadcasts` | Admin | Dispatch history |
| GET / PUT | `/api/admin/users[/:id/role]` | Admin | Role management |
| POST | `/api/admin/fetch` | Admin | Trigger NASA sync (`today` / `week`) |
| GET | `/api/admin/stats` · `/api/admin/test-nasa` · `/api/admin/test-risk/:id` | Admin | Diagnostics |

### Socket.IO Events

| Direction | Event | Payload |
|---|---|---|
| client → server | `join_user_room` | `{ token }` — subscribes to personal alerts |
| client → server | `watch_asteroid` / `unwatch_asteroid` | asteroid id |
| server → client | `CLOSE_APPROACH_ALERT` | alert matching the user's thresholds |
| server → client | `NEW_HAZARDOUS_ASTEROID` | high-risk object detected during sync |
| server → client | `DAILY_UPDATE` / `WEEKLY_UPDATE` | sync statistics |
| server → client | `ADMIN_BROADCAST` | admin-dispatched alert |
| `/chat` namespace | `chat:join_room`, `chat:send`, `chat:typing`, `chat:message`, … | authenticated with `auth: { token }` |

---

## Documentation

- [GUIDE.md](GUIDE.md) — risk formula, orbital mechanics, impact physics, data pipeline, caching
- [AI-LOG.md](AI-LOG.md) — AI assistance log
- [docs/](docs/) — presentation deck

## License

MIT
