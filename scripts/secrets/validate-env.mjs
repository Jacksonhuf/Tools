#!/usr/bin/env node
/**
 * Validate required environment variables for staging/production deploy.
 */
const deployEnv = (process.env.DEPLOY_ENV ?? "development").trim().toLowerCase();

const REQUIREMENTS = {
  staging: ["DATABASE_URL", "AUTH_DRIVER"],
  production: [
    "DATABASE_URL",
    "AUTH_DRIVER",
    "SHOP_CREDENTIAL_ENCRYPTION_KEY",
    "REDIS_URL",
    "EXPORT_S3_BUCKET",
    "EXPORT_S3_ENDPOINT",
  ],
};

function hasJwt() {
  return Boolean(
    process.env.OIDC_JWT_HS256_SECRET?.trim() ||
      process.env.OIDC_JWKS_URL?.trim() ||
      process.env.OIDC_JWKS_JSON?.trim()
  );
}

function isConfigured(key) {
  if (key === "OIDC_JWT_HS256_SECRET") return hasJwt();
  if (key === "AUTH_DRIVER") {
    const driver = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
    return driver === "oidc_jwt" || driver === "jwt";
  }
  return Boolean(process.env[key]?.trim());
}

if (deployEnv === "development" || deployEnv === "dev" || deployEnv === "local") {
  console.log(JSON.stringify({ deploy_env: "development", ready: true, missing: [] }));
  process.exit(0);
}

const envKey = deployEnv === "prod" || deployEnv === "production" ? "production" : "staging";
const keys = [...(REQUIREMENTS[envKey] ?? []), "OIDC_JWT_HS256_SECRET"];
const missing = keys.filter((key) => !isConfigured(key));

if (
  envKey === "production" &&
  (process.env.RULE_COMPILER_DRIVER ?? "heuristic").trim() === "llm_http" &&
  !process.env.RULE_COMPILER_LLM_ENDPOINT?.trim()
) {
  missing.push("RULE_COMPILER_LLM_ENDPOINT");
}

const result = {
  deploy_env: envKey,
  ready: missing.length === 0,
  missing: [...new Set(missing)],
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ready ? 0 : 1);
