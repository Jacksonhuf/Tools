import pg from "pg";

/** Serverless-friendly pg pool (fail fast when DATABASE_URL is unreachable). */
export function createPgPool(connectionString: string): pg.Pool {
  return new pg.Pool({
    connectionString,
    connectionTimeoutMillis: Number(
      process.env.PG_CONNECTION_TIMEOUT_MS ?? 5000
    ),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 10_000),
    max: Number(process.env.PG_POOL_MAX ?? 2),
  });
}
