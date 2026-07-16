CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sites (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  domain      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id            BIGSERIAL PRIMARY KEY,
  site_id       TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,             -- 'pageview' | 'event'
  name          TEXT,                      -- custom event name
  path          TEXT NOT NULL DEFAULT '/',
  referrer      TEXT,                      -- referring domain, null for direct
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  browser       TEXT,
  os            TEXT,
  device        TEXT,                      -- desktop | mobile | tablet
  country       TEXT,                      -- ISO 3166-1 alpha-2
  visitor       TEXT NOT NULL,             -- PERSISTENT device id (localStorage), stable across visits
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Identified variant: one row per known device per site.
-- email/name/traits are filled in when the tracked site calls nano.identify().
CREATE TABLE IF NOT EXISTS people (
  site_id     TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  visitor     TEXT NOT NULL,
  email       TEXT,
  name        TEXT,
  traits      JSONB NOT NULL DEFAULT '{}',
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, visitor)
);

CREATE TABLE IF NOT EXISTS goals (
  id          SERIAL PRIMARY KEY,
  site_id     TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,               -- display name, e.g. "Signed up"
  event_name  TEXT NOT NULL,               -- custom event that counts as conversion
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, event_name)
);

CREATE INDEX IF NOT EXISTS events_site_time_idx ON events (site_id, created_at);
CREATE INDEX IF NOT EXISTS events_site_visitor_idx ON events (site_id, visitor, created_at);
CREATE INDEX IF NOT EXISTS people_site_seen_idx ON people (site_id, last_seen DESC);
