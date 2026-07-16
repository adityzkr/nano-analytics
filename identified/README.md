# Nano Analytics — Identified Variant

A parallel build of Nano Analytics that trades anonymity for recognition:
visitors get a **persistent device ID stored in localStorage**, so the same
person is recognized across visits and days, and sites can attach a real
identity (email, name, custom traits) with `nano.identify()` — the
Mixpanel/Amplitude model rather than the Plausible model.

The original anonymous variant at the repo root is untouched; the two run side
by side with separate databases:

|  | Anonymous (root) | Identified (this folder) |
| --- | --- | --- |
| API / dashboard ports | 4000 / 5173 | **4100 / 5174** |
| Database | `analytics` | `analytics_identified` |
| Visitor identity | daily-rotating hash, IP never stored | persistent localStorage ID |
| Cross-day visitors | counted as new each day | recognized (accurate uniques) |
| Who was it? | unknowable | `nano.identify()` → People directory |
| Consent banner needed | no | **yes, in GDPR/ePrivacy territory** |

## Run it

```sh
createdb analytics_identified   # once
cd identified && npm install    # once
npm run dev:server              # API on http://localhost:4100
npm run dev:web                 # dashboard on http://localhost:5174
```

## What's different in the code

- **`server/public/tracker.js`** — generates a random ID on first visit,
  stores it in `localStorage` (`nano_vid`), and sends it with every event.
  Adds `nano.identify({ email, name, ...traits })` and `nano.reset()` (call on
  logout to unlink the device). If storage is blocked, the server falls back
  to the anonymous daily hash.
- **`server/src/collect.ts`** — accepts the client's `visitorId` (validated),
  upserts a row in the new **`people`** table on every event, and exposes
  `POST /api/collect/identify` to attach email/name/traits to a visitor.
- **`server/src/people.ts`** — `GET /api/sites/:id/people` (the directory:
  identity, first/last seen, activity counts) and
  `GET /api/sites/:id/people/:visitor/activity` (per-person event stream).
- **`web/`** — a **People** card on the site dashboard listing recent
  visitors: identified ones show name/email, others show
  "Anonymous · a1b2c3d4". Top bar shows an **ID** badge so you always know
  which variant you're looking at.
- Everything else (sessions, realtime, goals, wizard) is identical — but
  because IDs persist, unique-visitor and session numbers are now accurate
  across days.

## The compliance trade-off (read this)

Storing an identifier on the visitor's device and linking behavior to a person
is exactly what privacy laws regulate:

- **GDPR / ePrivacy (EU/UK):** you need informed consent *before* the tracker
  runs (a real cookie/consent banner), a privacy-policy disclosure, and a way
  to honor deletion requests (`DELETE` the person's rows in `people`/`events`).
- **Only call `identify()` for logged-in users of your own product** who have
  accepted your terms — that's the legitimate use case this variant is for
  (product analytics), not for identifying anonymous web visitors.
- `nano.reset()` on logout keeps shared computers from mixing identities.

If you don't need to know *who*, use the anonymous variant — it needs none of
the above.
