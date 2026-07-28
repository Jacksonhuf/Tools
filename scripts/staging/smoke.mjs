#!/usr/bin/env node
/**
 * HTTP smoke against a running BFF with staging profile.
 *
 * Usage:
 *   npm run staging:bootstrap
 *   DEPLOY_ENV=staging ... npm run dev:bff   # separate terminal
 *   node scripts/staging/smoke.mjs
 *
 * Or auto-start BFF:
 *   node scripts/staging/smoke.mjs --start-bff
 */
import { spawn } from "node:child_process";
import {
  loadStagingEnv,
  signHs256Jwt,
  waitForHttpOk,
} from "./lib.mjs";

const startBff = process.argv.includes("--start-bff");
const baseUrl = (process.env.BFF_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const env = loadStagingEnv(process.env.STAGING_ENV_FILE);
const secret = env.OIDC_JWT_HS256_SECRET ?? "change-me-staging-jwt-secret";
const tenantId = process.env.STAGING_TENANT_ID ?? "tenant-demo";

const jwt = signHs256Jwt(
  {
    sub: "staging-smoke",
    tenant_id: tenantId,
    roles: ["pricing:read", "pricing:write", "finance:approve", "channel:admin"],
  },
  secret
);

const authHeaders = {
  Authorization: `Bearer ${jwt}`,
  "X-Tenant-Id": tenantId,
};

async function checkEndpoint(path, assertFn) {
  const res = await fetch(`${baseUrl}${path}`, { headers: authHeaders });
  const body = await res.json();
  const detail = assertFn(res.status, body);
  return { path, status: res.status, ok: detail.ok, detail: detail.detail };
}

async function runChecks() {
  const results = [];

  results.push(
    await checkEndpoint("/health", (status) => ({
      ok: status === 200,
      detail: `status=${status}`,
    }))
  );

  results.push(
    await checkEndpoint("/api/v1/production/readiness", (status, body) => ({
      ok: status === 200 && body.deploy?.deploy_env === "staging",
      detail: `deploy_env=${body.deploy?.deploy_env}`,
    }))
  );

  results.push(
    await checkEndpoint("/api/v1/production/go-live", (status, body) => ({
      ok: status === 200 && Array.isArray(body.checks),
      detail: `ready=${body.ready} checks=${body.checks?.length ?? 0}`,
    }))
  );

  results.push(
    await checkEndpoint("/api/v1/ops/backup/status", (status, body) => ({
      ok: status === 200 && body.deploy_env === "staging",
      detail: `backup_ready=${body.ready}`,
    }))
  );

  results.push(
    await checkEndpoint("/api/v1/auth/me", (status, body) => ({
      ok: status === 200 && body.subject === "staging-smoke",
      detail: `subject=${body.subject}`,
    }))
  );

  results.push(
    await checkEndpoint("/api/v1/skus/demo-sku-001/pricing-context", (status, body) => ({
      ok: status === 200 && body.sku?.id === "demo-sku-001",
      detail: `sku=${body.sku?.id ?? "missing"}`,
    }))
  );

  return results;
}

async function main() {
  let bffChild = null;
  const childEnv = {
    ...process.env,
    ...env,
    DEPLOY_ENV: "staging",
    PORT: String(new URL(baseUrl).port || 3000),
  };

  if (startBff) {
    console.log("==> Starting BFF for staging smoke");
    bffChild = spawn("npm", ["run", "start", "-w", "@mx-pricing/bff"], {
      env: childEnv,
      stdio: "inherit",
    });
    await waitForHttpOk(`${baseUrl}/health`);
  }

  try {
    const results = await runChecks();
    const failed = results.filter((r) => !r.ok);
    console.log(JSON.stringify({ ok: failed.length === 0, results }, null, 2));
    if (failed.length > 0) process.exit(1);
  } finally {
    if (bffChild) {
      bffChild.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
