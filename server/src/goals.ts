import { Router } from "express";
import { pool } from "./db.js";
import { requireAuth, type AuthedRequest } from "./auth.js";
import { loadOwnedSite } from "./sites.js";

export const goalsRouter = Router({ mergeParams: true });
goalsRouter.use(requireAuth, loadOwnedSite);

const INTERVALS: Record<string, string> = {
  day: "24 hours",
  week: "7 days",
  month: "30 days",
};

// Goals with conversion stats for the period. Conversion rate follows GA:
// unique converting visitors / unique visitors.
goalsRouter.get("/", async (req: AuthedRequest, res) => {
  const siteId = req.params.id;
  const interval = INTERVALS[String(req.query.period)] ?? INTERVALS.week;
  const { rows: goals } = await pool.query(
    `SELECT g.id, g.name, g.event_name,
            count(e.id)::int AS conversions,
            count(DISTINCT e.visitor)::int AS converters
       FROM goals g
       LEFT JOIN events e
         ON e.site_id = g.site_id AND e.type = 'event' AND e.name = g.event_name
        AND e.created_at > now() - $2::interval
      WHERE g.site_id = $1
      GROUP BY g.id ORDER BY g.created_at`,
    [siteId, interval]
  );
  const { rows } = await pool.query(
    `SELECT count(DISTINCT visitor)::int AS visitors FROM events
      WHERE site_id = $1 AND created_at > now() - $2::interval`,
    [siteId, interval]
  );
  const visitors = rows[0].visitors;
  res.json({
    goals: goals.map((g) => ({
      ...g,
      conversion_rate: visitors ? Math.round((100 * g.converters) / visitors) : 0,
    })),
  });
});

goalsRouter.post("/", async (req: AuthedRequest, res) => {
  const { name, eventName } = req.body ?? {};
  if (!name || !eventName) return res.status(400).json({ error: "Name and event name required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO goals (site_id, name, event_name) VALUES ($1, $2, $3) RETURNING *",
      [req.params.id, String(name), String(eventName)]
    );
    res.json({ goal: rows[0] });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ error: "A goal for that event already exists" });
    throw e;
  }
});

goalsRouter.delete("/:goalId", async (req: AuthedRequest, res) => {
  await pool.query("DELETE FROM goals WHERE id = $1 AND site_id = $2", [
    req.params.goalId,
    req.params.id,
  ]);
  res.json({ ok: true });
});
