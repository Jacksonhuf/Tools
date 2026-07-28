import { resolveRuleCompilerDriver } from "./rule-compiler-adapter.js";
import { resolveDeployEnvironment } from "./deploy-environment.js";

export interface ProductionConfigStatus {
  production_mode: boolean;
  deploy_env: string;
  database_required: boolean;
  database_configured: boolean;
  auth_driver: string;
  dev_token_allowed: boolean;
  redis_configured: boolean;
  object_storage_configured: boolean;
  ready: boolean;
  issues: string[];
}

export function isProductionMode(): boolean {
  const flag = process.env.PRODUCTION_MODE?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  return process.env.NODE_ENV === "production";
}

export function evaluateProductionConfig(): ProductionConfigStatus {
  const deploy_env = resolveDeployEnvironment();
  const production_mode = isProductionMode() || deploy_env === "production";
  const database_configured = Boolean(process.env.DATABASE_URL?.trim());
  const auth_driver = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
  const redis_configured = Boolean(process.env.REDIS_URL?.trim());
  const object_storage_configured = Boolean(
    process.env.EXPORT_S3_BUCKET?.trim() &&
      process.env.EXPORT_S3_ENDPOINT?.trim()
  );
  const dev_token_allowed =
    !production_mode &&
    (auth_driver === "dev" || auth_driver === "oidc_stub");
  const issues: string[] = [];

  if (production_mode || deploy_env === "staging") {
    if (!database_configured && deploy_env !== "development") {
      issues.push("DATABASE_URL is required in staging/production");
    }
    if (deploy_env === "production" || production_mode) {
      if (auth_driver !== "oidc_jwt" && auth_driver !== "jwt") {
        issues.push("AUTH_DRIVER must be oidc_jwt in production mode");
      }
      if (!process.env.OIDC_JWT_HS256_SECRET?.trim() && !process.env.OIDC_JWKS_URL?.trim() && !process.env.OIDC_JWKS_JSON?.trim()) {
        issues.push("JWT validation must be configured (HS256 secret or JWKS)");
      }
      if (!process.env.SHOP_CREDENTIAL_ENCRYPTION_KEY?.trim()) {
        issues.push("SHOP_CREDENTIAL_ENCRYPTION_KEY is required in production mode");
      }
      if (resolveRuleCompilerDriver() === "llm_http") {
        if (!process.env.RULE_COMPILER_LLM_ENDPOINT?.trim()) {
          issues.push(
            "RULE_COMPILER_LLM_ENDPOINT is required for llm_http in production"
          );
        }
      }
    } else if (deploy_env === "staging") {
      if (auth_driver === "dev") {
        issues.push("AUTH_DRIVER should not be dev in staging");
      }
    }
  }

  return {
    production_mode,
    deploy_env,
    database_required: production_mode,
    database_configured,
    auth_driver,
    dev_token_allowed,
    redis_configured,
    object_storage_configured,
    ready: issues.length === 0,
    issues,
  };
}

export function assertProductionBoot(): void {
  const cfg = evaluateProductionConfig();
  if (!cfg.production_mode) return;
  if (!cfg.ready) {
    throw new Error(
      `Production boot failed: ${cfg.issues.join("; ")}`
    );
  }
}
