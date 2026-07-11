import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";

export const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE = "token";

export interface AuthedRequest extends Request {
  userId?: number;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: "Not logged in" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: number };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
}

function setSession(res: Response, userId: number) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 3600 * 1000,
  });
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || !email.includes("@") || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Valid email and a password of 8+ characters required" });
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [email.toLowerCase(), hash]
    );
    setSession(res, rows[0].id);
    res.json({ user: rows[0] });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ error: "Email already registered" });
    throw e;
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    String(email ?? "").toLowerCase(),
  ]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(String(password ?? ""), user.password))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  setSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email } });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query("SELECT id, email FROM users WHERE id = $1", [req.userId]);
  if (!rows[0]) return res.status(401).json({ error: "Not logged in" });
  res.json({ user: rows[0] });
});
