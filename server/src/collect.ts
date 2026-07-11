import { Router } from "express";
import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import { pool } from "./db.js";
import { JWT_SECRET } from "./auth.js";

export const collectRouter = Router();

// Privacy-friendly visitor id: hash of (secret, date, site, ip, ua).
// Rotates daily, so visitors can't be tracked across days and no IP is stored.
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
  const { siteId, type, name, url, referrer } = req.body ?? {};
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
      visitorHash(site.id, ip, String(ua)),
    ]
  );
  res.status(202).json({ ok: true });
});
