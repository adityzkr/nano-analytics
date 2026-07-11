# Architecture

Nano Analytics is a multi-tenant web analytics platform. This document explains
how the pieces fit together and why they're built the way they are.

## System overview

```
                         VISITOR'S BROWSER (on a tracked site)
                 ┌─────────────────────────────────────────────┐
                 │  tracker.js (script tag)  OR  nano-analytics │
                 │  npm SDK — fires pageviews + custom events   │
                 └──────────────────────┬──────────────────────┘
                                        │ POST /api/collect (CORS open, no cookies)
                                        ▼
┌──────────────┐   HTTP/JSON   ┌─────────────────────────────────────────┐
│  DASHBOARD   │ ────────────► │            EXPRESS API (server/)        │
│  React+Vite  │   /api/auth   │                                         │
│   (web/)     │   /api/sites  │  auth.ts     JWT cookie sessions        │
│              │   /api/.../   │  sites.ts    site CRUD + ownership      │
│  site owner  │   stats,goals │  collect.ts  ingestion pipeline         │
│  logs in     │               │  stats.ts    aggregation queries        │
└──────────────┘               │  goals.ts    conversion goals           │
                               └───────────────────┬─────────────────────┘
                                                   │ SQL (pg pool)
                                                   ▼
                                        ┌────────────────────┐
                                        │      POSTGRES      │
                                        │ users sites events │
                                        │       goals        │
                                        └────────────────────┘
```

Three codebases live in one npm-workspaces monorepo:

| Workspace | What it is | Runs |
| --- | --- | --- |
| `server/` | Express + TypeScript API; also serves `tracker.js` | port 4000 |
| `web/` | React + Vite dashboard for site owners | port 5173 (dev, proxies `/api` → 4000) |
| `sdk/` | `nano-analytics` npm package (~1 KB) for tracked apps | inside customers' apps |

`demo-site/` is a dev fixture — static pages + an SPA page with the tracker
installed, served on port 8080 — not part of the product.

## The two data paths

The system has two completely separate kinds of traffic:

**Ingestion (public, high volume).** Visitors' browsers on tracked sites call
`POST /api/collect`. This endpoint is unauthenticated (any origin may call it —
that's the point), validated only by site ID existence, and answers `202`
immediately. It must never set or read cookies: tracking works without consent
banners precisely because nothing identifying is stored client-side.

**Dashboard (authenticated, low volume).** Site owners log into the React app.
Auth is a JWT in an httpOnly cookie (`auth.ts`); every site-scoped route goes
through `requireAuth` + `loadOwnedSite`, which enforces tenant isolation — you
can only ever query sites whose `user_id` is yours.

## Ingestion pipeline (collect.ts)

Each hit goes through, in order:

1. **Site lookup** — reject unknown `siteId` (404).
2. **URL parsing** — extract `pathname` and `utm_source/medium/campaign` from
   the page URL sent by the tracker.
3. **Referrer cleaning** — reduce the full referrer URL to a bare domain;
   self-referrals (same domain as the site) become `null` (= direct traffic).
4. **User-agent parsing** (`ua-parser-js`) — browser, OS, device class
   (desktop / mobile / tablet).
5. **Geo lookup** (`geoip-lite`, in-process, no external calls) — country code
   from the client IP.
6. **Visitor hashing** — see privacy model below. The IP is used and discarded;
   it is never written to disk.
7. **Insert** one row into `events`.

There is no queue: at small-to-medium scale a single Postgres insert per hit is
fine. See "Scaling" for when that changes.

## Privacy model

The visitor identifier is:

```
sha256(secret | YYYY-MM-DD | siteId | ip | userAgent)  → first 32 hex chars
```

Consequences, all deliberate (this is the Plausible model):

- **No cookies, no localStorage** — nothing persists on the visitor's device.
- **No PII at rest** — the hash can't be reversed to an IP, and the raw IP is
  never stored.
- **Daily rotation** — the date in the hash means the same person gets a new
  identity every midnight (UTC). Cross-day tracking is impossible *by design*.
  Trade-off: a session spanning midnight counts as two sessions, and "unique
  visitors this month" over-counts compared to cookie-based GA.
- **Per-site scoping** — the same person on two tracked sites yields two
  unrelated hashes, so cross-site tracking is impossible too.

## Data model

Four tables (`server/src/schema.sql`):

- `users` — email + bcrypt password hash.
- `sites` — tenant unit. `id` is a 12-char nanoid that doubles as the public
  site ID in snippets (unguessable, so it can be public).
- `events` — the one big append-only table. Every pageview and custom event is
  a row carrying its dimensions (path, referrer, UTM, browser, OS, device,
  country, visitor hash). Indexed on `(site_id, created_at)` and
  `(site_id, visitor, created_at)`.
- `goals` — maps a custom event name to a named conversion, per site.

**There are no aggregate tables.** Every dashboard number is computed at read
time with SQL over `events`. This keeps writes trivial and means new metrics
can be added without backfills — at the cost of read-time work (fine for
millions of rows thanks to the indexes; see Scaling).

## Read-time aggregation (stats.ts)

`GET /api/sites/:id/stats?period=day|week|month` returns the whole dashboard
in one response: totals, a time series (hourly buckets for 24h, daily
otherwise), and top-10 breakdowns for pages, referrers, UTM sources, browsers,
OSes, devices, countries, and custom events — ten queries run in parallel via
`Promise.all`.

**Sessionization** is done entirely in SQL with window functions, GA-style:
order each visitor's hits by time, start a new session when the gap from the
previous hit exceeds 30 minutes (`lag() over`), number sessions with a running
sum, then aggregate. Bounce = session with ≤ 1 pageview; duration = last hit −
first hit. Nothing about sessions is stored — they're derived on demand.

**Realtime** (`/stats/live`) is just three more queries with short windows:
distinct visitors in the last 5 minutes, their current pages, and per-minute
pageviews for the last 30 minutes. The dashboard polls it every 10 seconds.

**Goals** (`goals.ts`) join `goals` to `events` on event name:
conversions (event count), converters (distinct visitors), and rate =
converters ÷ unique visitors, GA's definition.

## Trackers (tracker.js and sdk/)

Both trackers do the same thing; they differ only in packaging:

- `server/public/tracker.js` — plain script for a `<script defer …>` tag.
  Reads its site ID from `data-site-id` and derives the endpoint from its own
  `src`, so one snippet works in any environment.
- `sdk/` — the same logic as a typed ESM/CJS npm package with an explicit
  `init({ siteId, host })`, plus `track(name)` and `page()`. SSR-safe (no-ops
  outside a browser) and error-swallowing: analytics must never break the host
  app.

Route tracking is automatic in both: they monkey-patch `history.pushState`
(SDK also patches `replaceState`) and listen to `popstate`, deduplicating by
pathname. So SPA navigations are captured without router integration.

Delivery is `fetch(…, { credentials: "omit", keepalive: true })`.
**Why not `sendBeacon`?** Beacons always send credentials, and credentialed
cross-origin requests are incompatible with a wildcard CORS response — browsers
silently drop them. `keepalive: true` gives the same survives-page-unload
behavior without the credential problem. (This was found the hard way; see the
CORS config on `/api/collect` in `index.ts`, which reflects the origin as
defense in depth.)

## Design decisions summary

| Decision | Why |
| --- | --- |
| One `events` table, aggregate on read | Simple writes, flexible metrics, no backfills |
| Sessions derived in SQL, not stored | No session state to maintain or corrupt |
| Daily-rotating visitor hash, no cookies | Privacy/GDPR-friendliness over cross-day accuracy |
| Site ID is public and unguessable | Snippets must be embeddable in public HTML |
| `fetch keepalive` over `sendBeacon` | Beacon's forced credentials break wildcard CORS |
| JWT in httpOnly cookie (not localStorage) | XSS on the dashboard can't exfiltrate the token |
| Monorepo with npm workspaces | Shared nothing at runtime, shared tooling in dev |

## Scaling path

Current ceiling: a single Postgres comfortably handles millions of events per
site; the sessionization window functions are the first thing to slow down.
In order of effort:

1. **Rollup tables** — nightly (or streaming) aggregation into per-day
   per-dimension counts; keep raw events for drill-down only.
2. **Partition `events` by month** — keeps indexes small, makes retention
   (dropping old data) instant.
3. **Move events to ClickHouse** — the standard endgame for analytics
   (Plausible did exactly this); Postgres keeps users/sites/goals.
4. **Queue in front of ingestion** (only at very high write volume) — collect
   endpoint appends to a queue, a consumer batches inserts.
