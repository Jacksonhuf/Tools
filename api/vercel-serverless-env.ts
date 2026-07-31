/** Force in-memory / no-network drivers on Vercel unless Postgres is explicitly enabled. */
export function applyVercelServerlessDefaults(): void {
  if (process.env.VERCEL !== "1" || process.env.VERCEL_USE_PG === "1") {
    return;
  }

  process.env.CATALOG_DRIVER = "memory";
  process.env.AGENT_AUDIT_DRIVER = "memory";
  process.env.RECONCILIATION_DRIVER = "memory";
  process.env.REPRICING_DEBOUNCE_DRIVER = "memory";
  process.env.REPRICING_BATCH_QUEUE_DRIVER = "memory";
}
