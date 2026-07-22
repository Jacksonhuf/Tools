#!/usr/bin/env node
/**
 * Async queue worker (Loop 65) — digest + repricing batch job processing.
 */
const baseUrl = (process.env.BFF_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
);
const token = process.env.BFF_AUTH_TOKEN ?? "dev-token";
const tenantId = process.env.X_TENANT_ID ?? "tenant-demo";
const workerId = process.env.ASYNC_WORKER_ID ?? "async-worker-1";

const headers = {
  Authorization: `Bearer ${token}`,
  "X-Tenant-Id": tenantId,
  "Content-Type": "application/json",
};

async function request(path, init = {}) {
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function heartbeat(extra = {}) {
  await request("/api/v1/ops/workers/heartbeat", {
    method: "POST",
    body: JSON.stringify({
      worker_id: workerId,
      details: { mode: "async-queue", ...extra },
    }),
  });
}

async function main() {
  await heartbeat({ phase: "start" });
  const digest = await request("/api/v1/agent/digest/jobs/process", {
    method: "POST",
    body: JSON.stringify({ limit: 3 }),
  });
  const batch = await request("/api/v1/repricing-batch/jobs/process", {
    method: "POST",
    body: JSON.stringify({ limit: 2 }),
    headers: {
      ...headers,
      "X-Repricing-Worker-Id": workerId,
    },
  });
  await heartbeat({
    phase: "done",
    digest_processed: digest.processed?.length ?? 0,
    repricing_processed: batch.processed?.length ?? 0,
  });
  console.log(
    JSON.stringify({
      worker_id: workerId,
      digest: digest.processed?.length ?? 0,
      repricing: batch.processed?.length ?? 0,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
