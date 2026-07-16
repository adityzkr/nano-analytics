import { Router } from "express";
import { pool } from "./db.js";
import { requireAuth, type AuthedRequest } from "./auth.js";
import { loadOwnedSite } from "./sites.js";

export const statsRouter = Router({ mergeParams: true });
statsRouter.use(requireAuth, loadOwnedSite);

const PERIODS: Record<string, { interval: string; bucket: "hour" | "day" }> = {
  day: { interval: "24 hours", bucket: "hour" },
  week: { interval: "7 days", bucket: "day" },
  month: { interval: "30 days", bucket: "day" },
};

async function breakdown(siteId: string, interval: string, column: string, where = "") {
  const { rows } = await pool.query(
    `SELECT ${column} AS label, count(*)::int AS count, count(DISTINCT visitor)::int AS visitors
       FROM events
      WHERE site_id = $1 AND created_at > now() - $2::interval AND ${column} IS NOT NULL ${where}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    [siteId, interval]
  );
  return rows;
}

// GA-style sessionization: a session ends after 30 minutes of inactivity.
// Bounce = session with at most one pageview; duration = last hit - first hit.
const SESSION_SQL = `
  WITH hits AS (
    SELECT visitor, created_at, type FROM events
     WHERE site_id = $1 AND created_at > now() - $2::interval
  ), flagged AS (
    SELECT visitor, created_at, type,
           CASE WHEN lag(created_at) OVER w IS NULL
                  OR created_at - lag(created_at) OVER w > interval '30 minutes'
                THEN 1 ELSE 0 END AS is_new
      FROM hits WINDOW w AS (PARTITION BY visitor ORDER BY created_at)
  ), numbered AS (
    SELECT visitor, created_at, type,
           sum(is_new) OVER (PARTITION BY visitor ORDER BY created_at) AS session_no
      FROM flagged
  ), sessions AS (
    SELECT count(*) FILTER (WHERE type = 'pageview') AS pageviews,
           extract(epoch FROM max(created_at) - min(created_at)) AS duration
      FROM numbered GROUP BY visitor, session_no
  )
  SELECT count(*)::int AS sessions,
         coalesce(round(100.0 * count(*) FILTER (WHERE pageviews <= 1) / nullif(count(*), 0)), 0)::int AS bounce_rate,
         coalesce(round(avg(duration)), 0)::int AS avg_duration
    FROM sessions`;

statsRouter.get("/", async (req: AuthedRequest, res) => {
  const siteId = req.params.id;
  const { interval, bucket } = PERIODS[String(req.query.period)] ?? PERIODS.week;

  const [totals, sessions, series, pages, referrers, utmSources, browsers, oses, devices, countries, events] =
    await Promise.all([
      pool.query(
        `SELECT count(*) FILTER (WHERE type = 'pageview')::int AS pageviews,
                count(DISTINCT visitor)::int AS visitors,
                count(*) FILTER (WHERE type = 'event')::int AS custom_events
           FROM events WHERE site_id = $1 AND created_at > now() - $2::interval`,
        [siteId, interval]
      ),
      pool.query(SESSION_SQL, [siteId, interval]),
      pool.query(
        `SELECT date_trunc($3, created_at) AS bucket,
                count(*) FILTER (WHERE type = 'pageview')::int AS pageviews,
                count(DISTINCT visitor)::int AS visitors
           FROM events WHERE site_id = $1 AND created_at > now() - $2::interval
          GROUP BY 1 ORDER BY 1`,
        [siteId, interval, bucket]
      ),
      breakdown(siteId, interval, "path", "AND type = 'pageview'"),
      breakdown(siteId, interval, "referrer"),
      breakdown(siteId, interval, "utm_source"),
      breakdown(siteId, interval, "browser"),
      breakdown(siteId, interval, "os"),
      breakdown(siteId, interval, "device"),
      breakdown(siteId, interval, "country"),
      breakdown(siteId, interval, "name", "AND type = 'event'"),
    ]);

  res.json({
    totals: { ...totals.rows[0], ...sessions.rows[0] },
    series: series.rows.map((r) => ({ ...r, bucket: r.bucket.toISOString() })),
    bucket,
    pages,
    referrers,
    utmSources,
    browsers,
    oses,
    devices,
    countries,
    events,
  });
});

statsRouter.get("/live", async (req: AuthedRequest, res) => {
  const siteId = req.params.id;
  const [count, pages, series] = await Promise.all([
    pool.query(
      `SELECT count(DISTINCT visitor)::int AS live FROM events
        WHERE site_id = $1 AND created_at > now() - interval '5 minutes'`,
      [siteId]
    ),
    pool.query(
      `SELECT path AS label, count(DISTINCT visitor)::int AS count FROM events
        WHERE site_id = $1 AND type = 'pageview' AND created_at > now() - interval '5 minutes'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
      [siteId]
    ),
    pool.query(
      `SELECT date_trunc('minute', created_at) AS bucket, count(*)::int AS pageviews
         FROM events
        WHERE site_id = $1 AND created_at > now() - interval '30 minutes'
        GROUP BY 1 ORDER BY 1`,
      [siteId]
    ),
  ]);
  res.json({
    live: count.rows[0].live,
    pages: pages.rows,
    series: series.rows.map((r) => ({ ...r, bucket: r.bucket.toISOString() })),
  });
});
