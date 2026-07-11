# Nano Analytics

A self-hostable, privacy-friendly, multi-tenant web analytics platform — think
Google Analytics, minus the cookies. Users sign up, register their sites, embed
a tiny tracking snippet (or npm SDK), and get a realtime dashboard.

**Features:** unique visitors · page views · sessions, bounce rate & session
duration (GA-style, 30-min timeout) · realtime view (who's online, on which
pages) · top pages · referrers · UTM campaigns · browsers / OS / devices ·
countries · custom events · conversion goals · SPA route auto-tracking ·
setup wizard for new sites · no cookies, no stored IPs.

## Documentation

| Doc | For |
| --- | --- |
| [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) | **Start here if you're not technical** — the whole system explained in plain English, no jargon |
| [docs/USER_MANUAL.md](docs/USER_MANUAL.md) | Using the product step by step: accounts, connecting your website, reading every metric, goals, troubleshooting. Developer-only parts are clearly marked |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | For engineers: components, data flow, privacy model, design decisions, scaling path |

## Project layout

```
server/     Express + TypeScript API (port 4000) — auth, ingestion, stats; serves tracker.js
web/        React + Vite dashboard (port 5173 in dev, proxies /api → 4000)
sdk/        "nano-analytics" npm package (~1 KB) for tracked apps
demo-site/  Dev fixture: static pages + SPA with tracking installed (port 8080)
docs/       Architecture + user manual
```

## Quickstart (local)

Requires **Node 18+** and **Postgres** running locally.

```sh
createdb analytics        # schema is applied automatically on server start
npm install
npm run dev:server        # API on http://localhost:4000
npm run dev:web           # dashboard on http://localhost:5173
```

Open http://localhost:5173, sign up, add a site, and follow the in-dashboard
setup wizard.

Optional env vars: `DATABASE_URL` (default `postgresql://localhost:5432/analytics`),
`JWT_SECRET` (**set a strong one in production** — it also salts visitor
hashes), `PORT`.

## Tracking a site (summary)

Full instructions with framework-specific examples are in the
[user manual](docs/USER_MANUAL.md) and in the dashboard's setup wizard.

**Script tag** (any website):

```html
<script defer src="https://YOUR_HOST/tracker.js" data-site-id="SITE_ID"></script>
```

**npm SDK** (React, Next.js, Vue, any bundled app):

```ts
import { init, track } from "nano-analytics";
init({ siteId: "SITE_ID", host: "https://YOUR_HOST" });  // once at startup, SSR-safe
track("signup");                                          // custom events, anywhere
```

Page views and SPA route changes are tracked automatically in both cases.

To consume the SDK before it's published to a registry:

```sh
cd sdk && npm run build && npm pack          # → nano-analytics-0.1.0.tgz
npm install /path/to/nano-analytics-0.1.0.tgz  # in the tracked app
```

## API overview

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` `login` `logout`, `GET /api/auth/me` | cookie | Accounts (JWT in httpOnly cookie) |
| `GET/POST /api/sites`, `DELETE /api/sites/:id` | ✔ | Site management |
| `POST /api/collect` | none (CORS open) | Event ingestion from tracked sites |
| `GET /api/sites/:id/stats?period=day\|week\|month` | ✔ owner | Full dashboard bundle (totals, series, breakdowns) |
| `GET /api/sites/:id/stats/live` | ✔ owner | Realtime: online count, active pages, last 30 min |
| `GET/POST /api/sites/:id/goals`, `DELETE …/goals/:goalId` | ✔ owner | Conversion goals |

## Deploying to production

The analytics server must be reachable over **public HTTPS** from your
visitors' browsers — that's where tracking events come from.

1. Host `server/` anywhere Node runs (VPS, Railway, Render, Fly.io) with a
   managed Postgres; set `DATABASE_URL` and a strong `JWT_SECRET`.
2. Build the dashboard (`npm run build -w web`) and serve `web/dist/`
   statically — from the same Express server or any static host.
3. Point snippets at the deployed host:
   `https://analytics.yourcompany.com/tracker.js`.

## Known limitations

- Visitor identity rotates daily (privacy feature): cross-day visitors are
  counted again, and sessions spanning midnight split in two.
- Aggregations run directly on the `events` table — comfortable to millions of
  rows per site; the [architecture doc](docs/ARCHITECTURE.md#scaling-path)
  describes the scaling path (rollups → partitioning → ClickHouse).
- No email verification, password reset, or per-site team members yet.
- Site deletion exists in the API but not yet in the UI.
