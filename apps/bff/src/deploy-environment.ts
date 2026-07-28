export type DeployEnvironment = "development" | "staging" | "production";

const VALID: DeployEnvironment[] = ["development", "staging", "production"];

export function resolveDeployEnvironment(
  raw?: string | null
): DeployEnvironment {
  const key = (raw ?? process.env.DEPLOY_ENV ?? "development")
    .trim()
    .toLowerCase();
  if (key === "prod" || key === "production") return "production";
  if (key === "stage" || key === "staging") return "staging";
  if (key === "dev" || key === "development" || key === "local") {
    return "development";
  }
  return VALID.includes(key as DeployEnvironment)
    ? (key as DeployEnvironment)
    : "development";
}

export function isStagingOrProduction(): boolean {
  const env = resolveDeployEnvironment();
  return env === "staging" || env === "production";
}

export function getDeployEnvironmentStatus() {
  const deploy_env = resolveDeployEnvironment();
  return {
    deploy_env,
    production_mode: deploy_env === "production",
    staging_mode: deploy_env === "staging",
    cors_origins: (process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  };
}
