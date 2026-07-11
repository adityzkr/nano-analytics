import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://localhost:5432/analytics",
});

export async function migrate() {
  const schema = readFileSync(
    fileURLToPath(new URL("./schema.sql", import.meta.url)),
    "utf8"
  );
  await pool.query(schema);
}
