#!/usr/bin/env node
/**
 * Node-based NFR load baseline (TC-NFR-PERF-001 scaffold).
 * Used in CI when k6 is unavailable and for local quick checks.
 */
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const BASE_URL = process.env.BFF_BASE_URL ?? "http://127.0.0.1:3000";
const VUS = Number(process.env.NFR_VUS ?? 20);
const REQUESTS_PER_VU = Number(process.env.NFR_REQUESTS_PER_VU ?? 5);
const P95_THRESHOLD_MS = Number(process.env.NFR_P95_MS ?? 3000);
const PATH =
  process.env.NFR_PATH ??
  "/api/v1/skus/demo-sku-001/pricing-context?channel=MERCADO_LIBRE";

const HEADERS = {
  Authorization: "Bearer dev-token",
  "X-Tenant-Id": "tenant-demo",
};

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.ceil((p / 100) * sorted.length) - 1
  );
  return sorted[idx] ?? 0;
}

async function waitForHealth(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await delay(500);
  }
  throw new Error(`BFF health check failed at ${BASE_URL}/health`);
}

async function oneRequest() {
  const t0 = performance.now();
  const res = await fetch(`${BASE_URL}${PATH}`, { headers: HEADERS });
  const ms = performance.now() - t0;
  if (!res.ok) {
    throw new Error(`request failed: ${res.status}`);
  }
  return ms;
}

async function runLoad() {
  const durations = [];
  const workers = Array.from({ length: VUS }, async () => {
    for (let i = 0; i < REQUESTS_PER_VU; i += 1) {
      durations.push(await oneRequest());
    }
  });
  await Promise.all(workers);
  const p95 = percentile(durations, 95);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return {
    requests: durations.length,
    vus: VUS,
    avg_ms: Math.round(avg),
    p95_ms: Math.round(p95),
    threshold_ms: P95_THRESHOLD_MS,
    passed: p95 < P95_THRESHOLD_MS,
  };
}

async function maybeStartBff() {
  if (process.env.NFR_SKIP_BFF_START === "1") {
    await waitForHealth();
    return null;
  }
  const child = spawn("npm", ["run", "start", "-w", "@mx-pricing/bff"], {
    stdio: "inherit",
    env: { ...process.env, PORT: new URL(BASE_URL).port || "3000" },
  });
  await waitForHealth();
  return child;
}

async function main() {
  const child = await maybeStartBff();
  try {
    const result = await runLoad();
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) {
      process.exitCode = 1;
    }
  } finally {
    if (child && !child.killed) {
      child.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
