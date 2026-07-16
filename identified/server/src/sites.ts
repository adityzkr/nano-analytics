import { Router, type Response, type NextFunction } from "express";
import { nanoid } from "nanoid";
import { pool } from "./db.js";
import { requireAuth, type AuthedRequest } from "./auth.js";

export const sitesRouter = Router();
sitesRouter.use(requireAuth);

// Loads the site and verifies the logged-in user owns it.
export async function loadOwnedSite(req: AuthedRequest, res: Response, next: NextFunction) {
  const { rows } = await pool.query("SELECT * FROM sites WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.userId,
  ]);
  if (!rows[0]) return res.status(404).json({ error: "Site not found" });
  (req as any).site = rows[0];
  next();
}

sitesRouter.get("/", async (req: AuthedRequest, res) => {
  const { rows } = await pool.query(
    `SELECT s.*,
            (SELECT count(DISTINCT visitor) FROM events e
              WHERE e.site_id = s.id AND e.created_at > now() - interval '24 hours') AS visitors_24h
       FROM sites s WHERE user_id = $1 ORDER BY created_at`,
    [req.userId]
  );
  res.json({ sites: rows });
});

sitesRouter.post("/", async (req: AuthedRequest, res) => {
  const { name, domain } = req.body ?? {};
  if (!name || !domain) return res.status(400).json({ error: "Name and domain required" });
  const cleanDomain = String(domain)
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  const id = nanoid(12);
  const { rows } = await pool.query(
    "INSERT INTO sites (id, user_id, name, domain) VALUES ($1, $2, $3, $4) RETURNING *",
    [id, req.userId, String(name), cleanDomain]
  );
  res.json({ site: rows[0] });
});

sitesRouter.delete("/:id", loadOwnedSite, async (req: AuthedRequest, res) => {
  await pool.query("DELETE FROM sites WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});
