import { resolveDeployEnvironment } from "./deploy-environment.js";
import { isProductionMode } from "./production-config.js";

export interface SecretRequirement {
  key: string;
  required_in: Array<"staging" | "production">;
  description: string;
}

export const SECRET_REQUIREMENTS: SecretRequirement[] = [
  {
    key: "DATABASE_URL",
    required_in: ["staging", "production"],
    description: "PostgreSQL connection string",
  },
  {
    key: "AUTH_DRIVER",
    required_in: ["staging", "production"],
    description: "Must be oidc_jwt in staging/production",
  },
  {
    key: "OIDC_JWT_HS256_SECRET",
    required_in: ["staging", "production"],
    description: "JWT HS256 secret (or configure JWKS)",
  },
  {
    key: "SHOP_CREDENTIAL_ENCRYPTION_KEY",
    required_in: ["production"],
    description: "AES key for shop credential encryption",
  },
  {
    key: "REDIS_URL",
    required_in: ["production"],
    description: "Redis for repricing debounce",
  },
  {
    key: "EXPORT_S3_BUCKET",
    required_in: ["production"],
    description: "S3-compatible export bucket",
  },
  {
    key: "EXPORT_S3_ENDPOINT",
    required_in: ["production"],
    description: "S3-compatible export endpoint",
  },
  {
    key: "RULE_COMPILER_LLM_ENDPOINT",
    required_in: ["production"],
    description: "Required when RULE_COMPILER_DRIVER=llm_http",
  },
];

function hasJwtValidation(): boolean {
  return Boolean(
    process.env.OIDC_JWT_HS256_SECRET?.trim() ||
      process.env.OIDC_JWKS_URL?.trim() ||
      process.env.OIDC_JWKS_JSON?.trim()
  );
}

function isConfigured(key: string): boolean {
  if (key === "OIDC_JWT_HS256_SECRET") return hasJwtValidation();
  if (key === "AUTH_DRIVER") {
    const driver = (process.env.AUTH_DRIVER ?? "dev").trim().toLowerCase();
    return driver === "oidc_jwt" || driver === "jwt";
  }
  return Boolean(process.env[key]?.trim());
}

export function evaluateSecretsStatus() {
  const deploy_env = resolveDeployEnvironment();
  const checks = SECRET_REQUIREMENTS.map((req) => {
    const applies = req.required_in.includes(
      deploy_env as "staging" | "production"
    );
    const configured = isConfigured(req.key);
  const optionalLlm =
      req.key === "RULE_COMPILER_LLM_ENDPOINT" &&
      (process.env.RULE_COMPILER_DRIVER ?? "heuristic").trim() !== "llm_http";
    const passed = !applies || optionalLlm || configured;
    return {
      key: req.key,
      applies,
      configured,
      passed,
      description: req.description,
    };
  });

  const applicable = checks.filter((c) => c.applies);
  const missing = applicable.filter((c) => !c.passed).map((c) => c.key);

  return {
    deploy_env,
    production_mode: isProductionMode(),
    ready: missing.length === 0 || deploy_env === "development",
    missing,
    checks,
  };
}
