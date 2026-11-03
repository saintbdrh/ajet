import pg from "pg";

// Portable Postgres access. Works with local Docker Postgres, Neon, or Postgres on a VPS: only DATABASE_URL changes.
// Statements keep the prepare().bind().all() shape and "?" placeholders; they are rewritten to $1, $2, ... here.

pg.types.setTypeParser(pg.types.builtins.INT8, Number);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (value) => new Date(value).toISOString());

type Executor = pg.Pool | pg.PoolClient;
// Failed queries throw; `success` and `error` are kept so callers written for the D1 result shape still type-check.
export type QueryResult<T> = { success: true; error?: string; results: T[]; meta: { changes: number } };

const isBuild = process.env.NEXT_PHASE === "phase-production-build";
const globalForDb = globalThis as typeof globalThis & { ajetDb?: { url: string; pool: pg.Pool } };

function toPositional(sql: string): string {
  let index = 0;
  let quoted = false;
  let out = "";
  for (const char of sql) {
    if (char === "'") quoted = !quoted;
    out += char === "?" && !quoted ? `$${++index}` : char;
  }
  return out;
}

export class Statement {
  constructor(
    private readonly executor: Executor,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...params: unknown[]): Statement {
    return new Statement(this.executor, this.sql, params);
  }

  async execute<T = Record<string, unknown>>(executor: Executor = this.executor): Promise<QueryResult<T>> {
    const result = await executor.query(toPositional(this.sql), this.params);
    return { success: true, results: result.rows as T[], meta: { changes: result.rowCount ?? 0 } };
  }

  all<T = Record<string, unknown>>(): Promise<QueryResult<T>> {
    return this.execute<T>();
  }

  run(): Promise<QueryResult<never>> {
    return this.execute<never>();
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    return (await this.execute<T>()).results[0] ?? null;
  }
}

export class Database {
  constructor(private readonly executor: Executor) {}

  prepare(sql: string): Statement {
    return new Statement(this.executor, sql);
  }

  /** Runs statements in order inside one transaction; any failure rolls back all of them and throws. */
  batch(statements: Statement[]): Promise<QueryResult<Record<string, unknown>>[]> {
    return this.transaction(async (tx) => {
      const results: QueryResult<Record<string, unknown>>[] = [];
      for (const statement of statements) results.push(await statement.execute(tx.executor));
      return results;
    });
  }

  /** Runs fn inside a transaction. Throwing from fn rolls back. Nested calls reuse the outer transaction. */
  async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
    if (!(this.executor instanceof pg.Pool)) return fn(this);
    const client = await this.executor.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(new Database(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function getDatabase(): Promise<Database | null> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production" || isBuild) return null;
    throw new Error("DATABASE_URL is not configured.");
  }
  // Cached on globalThis so dev hot reloads reuse one pool; rebuilt if DATABASE_URL changes.
  if (!globalForDb.ajetDb || globalForDb.ajetDb.url !== url) {
    void globalForDb.ajetDb?.pool.end();
    globalForDb.ajetDb = { url, pool: new pg.Pool({ connectionString: url, max: 10 }) };
  }
  return new Database(globalForDb.ajetDb.pool);
}
