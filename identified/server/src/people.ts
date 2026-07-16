import { Router } from "express";
import { pool } from "./db.js";
import { requireAuth, type AuthedRequest } from "./auth.js";
import { loadOwnedSite } from "./sites.js";

export const peopleRouter = Router({ mergeParams: true });
peopleRouter.use(requireAuth, loadOwnedSite);

// The people directory: most recently seen first, with activity rollups.
peopleRouter.get("/", async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `SELECT p.visitor, p.email, p.name, p.first_seen, p.last_seen,
            count(e.id) FILTER (WHERE e.type = 'pageview')::int AS pageviews,
            count(e.id) FILTER (WHERE e.type = 'event')::int AS events,
            max(e.country) AS country,
            max(e.device) AS device
       FROM people p
       LEFT JOIN events e ON e.site_id = p.site_id AND e.visitor = p.visitor
      WHERE p.site_id = $1
      GROUP BY p.site_id, p.visitor
      ORDER BY p.last_seen DESC
      LIMIT 50`,
    [req.params.id]
  );
  res.json({ people: rows });
});

// Recent activity for one person — powers the per-visitor drill-down.
peopleRouter.get("/:visitor/activity", async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `SELECT type, name, path, referrer, created_at FROM events
      WHERE site_id = $1 AND visitor = $2
      ORDER BY created_at DESC LIMIT 50`,
    [req.params.id, req.params.visitor]
  );
  res.json({ activity: rows });
});
