import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { migrate } from "./db.js";
import { authRouter } from "./auth.js";
import { sitesRouter } from "./sites.js";
import { collectRouter } from "./collect.js";
import { statsRouter } from "./stats.js";
import { goalsRouter } from "./goals.js";

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.use(cookieParser());

// The collect endpoint and tracker must be reachable from any tracked site.
app.use("/api/collect", cors({ origin: true, credentials: true }), collectRouter);
app.get("/tracker.js", cors(), (_req, res) => {
  res.sendFile(fileURLToPath(new URL("../public/tracker.js", import.meta.url)));
});

app.use("/api/auth", authRouter);
app.use("/api/sites", sitesRouter);
app.use("/api/sites/:id/stats", statsRouter);
app.use("/api/sites/:id/goals", goalsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT ?? 4000);
await migrate();
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
