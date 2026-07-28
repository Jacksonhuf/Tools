#!/usr/bin/env node
/**
 * Bootstrap local staging stack: docker compose, WAL dir, migrations, secrets check.
 *
 * Usage:
 *   node scripts/staging/bootstrap.mjs
 *   node scripts/staging/bootstrap.mjs --skip-docker   # CI / external PG+Redis
 */
import { mkdirSync } from "node:fs";
import { loadStagingEnv, runCommand, waitForPort } from "./lib.mjs";

const skipDocker = process.argv.includes("--skip-docker");
const env = loadStagingEnv(process.env.STAGING_ENV_FILE);

const pgHost = process.env.STAGING_PG_HOST ?? "localhost";
const pgPort = Number(process.env.STAGING_PG_PORT ?? 5433);
const redisPort = Number(process.env.STAGING_REDIS_PORT ?? 6380);
const databaseUrl =
  env.DATABASE_URL ??
  `postgresql://mx:mx_staging_secret@${pgHost}:${pgPort}/mx_pricing_staging`;

async function main() {
  mkdirSync("backups/wal-archive", { recursive: true });

  if (!skipDocker) {
    console.log("==> Starting staging docker compose");
    await runCommand("docker", [
      "compose",
      "-f",
      "docker-compose.staging.yml",
      "up",
      "-d",
    ]);
    await waitForPort(pgHost, pgPort);
    await waitForPort("localhost", redisPort);
  } else {
    console.log("==> Skipping docker (--skip-docker)");
    await waitForPort(pgHost, pgPort);
  }

  console.log("==> Building packages");
  await runCommand("npm", ["run", "build"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  console.log("==> Running migrations");
  await runCommand("npm", ["run", "db:migrate"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });

  console.log("==> Validating staging secrets");
  await runCommand("node", ["scripts/secrets/validate-env.mjs"], {
    env: {
      ...process.env,
      ...env,
      DEPLOY_ENV: "staging",
      DATABASE_URL: databaseUrl,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        deploy_env: "staging",
        database_url: databaseUrl.replace(/:[^:@/]+@/, ":***@"),
        redis_url: env.REDIS_URL ?? `redis://localhost:${redisPort}`,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
