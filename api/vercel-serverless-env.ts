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

  if (!process.env.AUTH_DRIVER?.trim()) {
    process.env.AUTH_DRIVER = "oidc_jwt";
  }
  if (!process.env.OIDC_JWT_HS256_SECRET?.trim()) {
    process.env.OIDC_JWT_HS256_SECRET =
      "mx-pricing-vercel-demo-jwt-secret-replace-me";
  }
  if (!process.env.SHOP_CREDENTIAL_ENCRYPTION_KEY?.trim()) {
    process.env.SHOP_CREDENTIAL_ENCRYPTION_KEY =
      "vercel-demo-shop-credential-key!!";
  }
}
