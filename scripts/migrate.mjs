// Applies migrations/*.sql in filename order, each in its own transaction.
// Usage: DATABASE_URL=postgres://... node scripts/migrate.mjs
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");

const dir = new URL("../migrations/", import.meta.url);
const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  );
  const applied = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((row) => row.name));
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(new URL(file, dir), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : error}`);
    }
    console.log(`applied ${file}`);
    count += 1;
  }
  console.log(count ? `${count} migration(s) applied.` : "Database is up to date.");
} finally {
  await client.end();
}
