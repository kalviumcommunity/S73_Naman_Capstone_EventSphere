# EventSphere — Local Event Discovery

Find out what's actually on near you. EventSphere pulls **real events from live
providers every day**, so the catalogue is never a stale list of made-up samples.

**Live demo:** https://s73-naman-capstone-eventsphere.onrender.com

---

## The problem

People miss out on events happening around them because there is no single place
to look. Listings are scattered across ticketing sites, city councils, meetup
platforms and conference sites — each with its own search, and most of them stale.

EventSphere aggregates them into one searchable catalogue, refreshed daily, with
saving, RSVPs and a feed tuned to what you care about.

---

## How the data works

This is the part that makes EventSphere a product rather than a demo. Events are
**ingested from real providers on a daily cron schedule**, deduplicated, and
pruned once they finish.

| Provider | Data | API key |
|---|---|---|
| **developers.events** | ~800 developer conferences and meetups worldwide | Not required |
| **NYC Parks** | ~1,200 free public events across New York City, next 14 days | Not required |
| **Ticketmaster Discovery** | Concerts, sports and theatre in your configured cities | Free key |

Two of the three providers need no credentials at all, so a fresh clone has
**~2,000 real upcoming events** the moment you run the bootstrap.

### Ingestion pipeline

```
node-cron (daily 03:15 UTC)
        │
        ▼
  services/eventSync.js ──► providers/devEvents.js    (JSON feed)
        │                ──► providers/nycParks.js     (RSS feed)
        │                ──► providers/ticketmaster.js (REST, keyed)
        │
        ├─ normalise to one Event shape
        ├─ bulk upsert keyed on (source, sourceId)   ← idempotent, no duplicates
        ├─ prune events that finished > 2 days ago    ← never touches user events
        └─ write a SyncLog row                        ← GET /api/sync/status
```

- **Idempotent.** Re-running a sync updates in place; it never creates duplicates.
- **Fault tolerant.** One provider failing does not sink the run — the sync is
  recorded as `partial` and the others still land.
- **Safe.** Pruning is restricted to an explicit source allowlist, so
  user-created events can never be deleted by the ingestion job.
- **Self-healing.** On boot, if the last successful sync is older than
  `SYNC_STALE_HOURS`, a catch-up run is triggered. A server that was asleep
  overnight still serves fresh events.

### Unlocking Ticketmaster (optional, 2 minutes)

Local concerts, sports and theatre come from Ticketmaster. Grab a free key at
[developer-acct.ticketmaster.com](https://developer-acct.ticketmaster.com/user/register)
and add it to `backend/.env`:

```env
TICKETMASTER_API_KEY=your_key_here
SYNC_CITIES=Bengaluru,Mumbai,Delhi,London,New York
```

Then run `npm run sync`. Without a key the provider is skipped with a log line
and the keyless sources carry the catalogue.

---

## Features

| | |
|---|---|
| **Daily ingestion** | Real events from three providers, refreshed on a cron schedule |
| **Search & filter** | Keyword, place, category, city, date range, free-only, online/in-person, sort |
| **Shareable views** | Every filter lives in the URL, so a filtered search can be linked |
| **Bookmarks** | Save events, with optimistic updates and rollback on failure |
| **RSVP** | Mark yourself as going; attendee counts on cards and detail pages |
| **For You** | Pick interests on your profile to narrow the feed to your categories |
| **Post events** | Create, edit and delete your own events, with cover-image upload |
| **Add to calendar** | RFC 5545 `.ics` export for any event |
| **Timezone-correct** | A New York event reads as its local time with a zone label, not shifted into yours |
| **Light & dark** | Follows your device by default, with a manual override |
| **Accessible** | Keyboard navigable, focus-visible rings, skip link, ARIA states, reduced-motion support |

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite 7, React Router 7 |
| Backend | Node.js, Express 4 |
| Database | MongoDB (Mongoose 8) |
| Auth | JWT, bcrypt |
| Scheduling | node-cron |
| Security | helmet, express-rate-limit, express-validator |
| Styling | Hand-written CSS with a token-based design system |

No CSS framework and no component library — the design system in
`client/src/styles/` is about 1,200 lines of tokens and components.

---

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB (local, or a MongoDB Atlas URI)

### Install

```bash
git clone https://github.com/kalviumcommunity/S73_Naman_Capstone_EventSphere.git
cd S73_Naman_Capstone_EventSphere
npm install
cd client && npm install && cd ..
```

### Configure

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env` — at minimum set `MONGO_URI` and `JWT_SECRET`.

> Environment variables are resolved against the `backend/` directory
> explicitly, so `npm start` from the repo root and `node server.js` from
> `backend/` both work.

### Populate with real events

```bash
npm run bootstrap
```

This creates the demo account and runs one full ingestion pass. Expect around
2,000 real upcoming events.

### Run

```bash
# Terminal 1 — API (also serves the built frontend if one exists)
npm run dev

# Terminal 2 — Vite dev server with hot reload
npm run dev:client
```

Open http://localhost:5173 for development, or build once and use the API's own
origin:

```bash
npm run build && npm start   # http://localhost:1369
```

**Demo account:** `demo@eventsphere.com` / `demo123456`

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API with nodemon |
| `npm run dev:client` | Vite dev server |
| `npm run build` | Install deps and build the frontend |
| `npm start` | Production server (API + built SPA) |
| `npm run bootstrap` | Demo user + full ingestion run |
| `npm run sync` | One-off ingestion run |
| `node backend/scripts/apitest.js` | 82-case API regression suite |

---

## API

### Auth
| Method | Endpoint | Notes |
|---|---|---|
| POST | `/api/auth/register` | Returns a token — no second sign-in step |
| POST | `/api/auth/login` | |
| GET | `/api/auth/me` | 🔒 Validates a stored token on boot |

### Events
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/events` | Paginated. `keyword`, `location`, `category`, `city`, `country`, `dateFrom`, `dateTo`, `free`, `online`, `source`, `forYou`, `sort`, `page`, `limit`, `includePast` |
| GET | `/api/events/:id` | |
| GET | `/api/events/:id/similar` | Same category or city, upcoming |
| GET | `/api/events/mine` | 🔒 |
| POST | `/api/events` | 🔒 |
| PUT | `/api/events/:id` | 🔒 Creator only; synced events are read-only |
| DELETE | `/api/events/:id` | 🔒 Creator only |
| POST/DELETE | `/api/events/:id/attend` | 🔒 RSVP |

### Users
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/me` | 🔒 Profile with counts |
| PATCH | `/api/me` | 🔒 Name, city, bio, interests |
| GET | `/api/me/bookmarks` | 🔒 |
| POST/DELETE | `/api/me/bookmarks/:eventId` | 🔒 |
| GET | `/api/me/attending` | 🔒 |

> The older `/api/users/:userId/bookmark(s)` routes still work.

### Meta
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/api/health` | Liveness + database state |
| GET | `/api/stats` | Totals, city count, category breakdown, last sync |
| GET | `/api/cities` | Cities with upcoming events |
| GET | `/api/sync/status` | Provider config, schedule, recent runs |
| POST | `/api/sync/run` | Manual sync — needs `x-admin-token` |

🔒 = `Authorization: Bearer <token>`

---

## Security

Findings from the audit of the previous version, and what was done:

| Issue | Fix |
|---|---|
| `PUT /api/events/:id` passed `req.body` into `findByIdAndUpdate`, letting anyone reassign `createdBy` and lock the real owner out | Explicit field allowlist; `createdBy`, `source` and `attendees` are server-controlled |
| `POST /api/upload` had no authentication | Requires a valid token |
| Upload accepted SVG, served from our own origin — stored XSS | Raster MIME allowlist; extension derived from the validated type; `nosniff` on the static mount |
| Upload path was CWD-relative, so files landed outside the served directory | Resolved against `__dirname` |
| API 404s fell through to the SPA and returned 200 HTML | JSON 404 handler mounted before the SPA fallback |
| Error handler sat behind the catch-all route and was unreachable | Registered last, after every route |
| Password hashes were selectable by default | `select: false`, with explicit opt-in at login |
| Search input went unescaped into `$regex` | Metacharacters escaped |
| No rate limiting | Global, auth and write limiters |
| No security headers | helmet with a CSP that still allows provider images |
| Login errors distinguished unknown email from wrong password | One message for both |

Run the suite against a live server:

```bash
node backend/scripts/apitest.js
```

---

## Project structure

```
backend/
├── config/         env loading, database connection
├── middleware/     auth, error handling, validation, rate limiting
├── models/         Event, User, SyncLog
├── routes/         auth, events, users, upload, meta
├── services/
│   ├── providers/  devEvents, nycParks, ticketmaster
│   ├── eventSync.js   ingestion orchestrator
│   └── scheduler.js   daily cron
├── scripts/        sync.js, apitest.js
└── server.js

client/src/
├── api/            axios instance, interceptors, error normalisation
├── components/
│   ├── ui/         Button, Field, Badge, Modal, Skeleton, Icons…
│   ├── layout/     Navbar, Footer
│   └── events/     EventCard, EventGrid
├── context/        Auth, Theme, Toast
├── lib/            formatting, .ics export, bookmark hook
├── pages/          Home, EventDetails, EventForm, Collection, Profile…
└── styles/         tokens, base, components, app
```

---

## Deployment

The server serves the built SPA from the same origin, so one service runs
everything.

**Render:** Build `npm run build`, start `npm start`. Set `MONGO_URI`,
`JWT_SECRET`, `NODE_ENV=production`, and optionally `TICKETMASTER_API_KEY`.

The cron scheduler runs in-process. On a host that sleeps idle instances, the
boot catch-up sync keeps the catalogue current.

---

## Author

**Naman** — built for the Kalvium Capstone.
