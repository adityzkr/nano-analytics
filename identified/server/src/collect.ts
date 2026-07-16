import { Router } from "express";
import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import { pool } from "./db.js";
import { JWT_SECRET } from "./auth.js";

export const collectRouter = Router();

// Identified variant: the tracker sends a persistent device id it stores in
// localStorage, so the same visitor is recognized across days and visits.
const VISITOR_ID_RE = /^[A-Za-z0-9_-]{10,64}$/;

// Fallback for browsers where storage is blocked: the anonymous daily hash.
function visitorHash(siteId: string, ip: string, ua: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${JWT_SECRET}|${day}|${siteId}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
}

function clientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string") return fwd.split(",")[0].trim();
  return req.ip ?? "0.0.0.0";
}

function referrerDomain(referrer: unknown, ownDomain: string): string | null {
  if (typeof referrer !== "string" || !referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host && host !== ownDomain ? host : null;
  } catch {
    return null;
  }
}

collectRouter.post("/", async (req, res) => {
  const { siteId, type, name, url, referrer, visitorId } = req.body ?? {};
  if (typeof siteId !== "string") return res.status(400).json({ error: "siteId required" });
  const eventType = type === "event" ? "event" : "pageview";
  if (eventType === "event" && typeof name !== "string") {
    return res.status(400).json({ error: "Event name required" });
  }

  const { rows } = await pool.query("SELECT id, domain FROM sites WHERE id = $1", [siteId]);
  const site = rows[0];
  if (!site) return res.status(404).json({ error: "Unknown site" });

  let path = "/";
  let utm: Record<string, string | null> = { source: null, medium: null, campaign: null };
  try {
    const u = new URL(String(url ?? ""));
    path = u.pathname || "/";
    utm = {
      source: u.searchParams.get("utm_source"),
      medium: u.searchParams.get("utm_medium"),
      campaign: u.searchParams.get("utm_campaign"),
    };
  } catch {
    /* keep defaults if url is missing/invalid */
  }

  const ua = req.headers["user-agent"] ?? "";
  const parsed = new UAParser(ua).getResult();
  const deviceType = parsed.device.type; // undefined for desktop
  const device = deviceType === "mobile" || deviceType === "tablet" ? deviceType : "desktop";

  const ip = clientIp(req);
  const geo = geoip.lookup(ip);

  const visitor =
    typeof visitorId === "string" && VISITOR_ID_RE.test(visitorId)
      ? visitorId
      : visitorHash(site.id, ip, String(ua));

  // Keep the people directory current: create on first sight, bump last_seen after.
  await pool.query(
    `INSERT INTO people (site_id, visitor) VALUES ($1, $2)
     ON CONFLICT (site_id, visitor) DO UPDATE SET last_seen = now()`,
    [site.id, visitor]
  );

  await pool.query(
    `INSERT INTO events (site_id, type, name, path, referrer, utm_source, utm_medium, utm_campaign,
                         browser, os, device, country, visitor)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      site.id,
      eventType,
      eventType === "event" ? String(name).slice(0, 100) : null,
      path.slice(0, 500),
      referrerDomain(referrer, site.domain),
      utm.source,
      utm.medium,
      utm.campaign,
      parsed.browser.name ?? null,
      parsed.os.name ?? null,
      device,
      geo?.country ?? null,
      visitor,
    ]
  );
  res.status(202).json({ ok: true });
});

// nano.identify() — attach a real identity (email, name, arbitrary traits)
// to a persistent visitor id. Same open-CORS posture as collect.
collectRouter.post("/identify", async (req, res) => {
  const { siteId, visitorId, email, name, traits } = req.body ?? {};
  if (typeof siteId !== "string" || typeof visitorId !== "string" || !VISITOR_ID_RE.test(visitorId)) {
    return res.status(400).json({ error: "siteId and visitorId required" });
  }
  const { rows } = await pool.query("SELECT id FROM sites WHERE id = $1", [siteId]);
  if (!rows[0]) return res.status(404).json({ error: "Unknown site" });

  const cleanTraits =
    traits && typeof traits === "object" && !Array.isArray(traits) ? traits : {};
  await pool.query(
    `INSERT INTO people (site_id, visitor, email, name, traits)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (site_id, visitor) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, people.email),
       name = COALESCE(EXCLUDED.name, people.name),
       traits = people.traits || EXCLUDED.traits,
       last_seen = now()`,
    [
      siteId,
      visitorId,
      typeof email === "string" ? email.slice(0, 200) : null,
      typeof name === "string" ? name.slice(0, 200) : null,
      JSON.stringify(cleanTraits),
    ]
  );
  res.status(202).json({ ok: true });
});
