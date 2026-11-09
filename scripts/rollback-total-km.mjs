import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const migration = "0006_total_km_stats.sql";
  const applied = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [migration]);
  if (applied.rowCount !== 1) throw new Error(`${migration} is not applied.`);
  const sql = await readFile(new URL("../migrations/rollback/0006_total_km_stats.sql", import.meta.url), "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("DELETE FROM schema_migrations WHERE name = $1", [migration]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
  console.log(`${migration} rolled back. Feature-specific flight and baseline data was removed.`);
} finally {
  await client.end();
}
