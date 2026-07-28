#!/usr/bin/env node
/**
 * Async queue worker — digest, repricing batch, listing sync, reconciliation, repricing events.
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

  let listingSync = { skipped: true };
  try {
    listingSync = await request("/api/v1/ops/listing-sync/run-due?force=true", {
      method: "POST",
    });
  } catch {
    /* schedule may be disabled */
  }

  let reconciliation = { checked: 0 };
  try {
    reconciliation = await request("/api/v1/ops/reconciliation/run-due", {
      method: "POST",
    });
  } catch {
    /* auth or listing errors in demo */
  }

  const listingIds = (process.env.REPRICING_LISTING_IDS ??
    "listing-ml-001,listing-amz-001")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let repricingProcessed = 0;
  for (const listingId of listingIds) {
    try {
      await request(`/api/v1/listings/${listingId}/ingest/run`, { method: "POST" });
      const flushed = await request(
        `/api/v1/listings/${listingId}/repricing-events/flush`,
        { method: "POST" }
      );
      if (flushed?.event?.id) {
        await request(`/api/v1/repricing-events/${flushed.event.id}/process`, {
          method: "POST",
        });
        repricingProcessed += 1;
      }
    } catch {
      /* per-listing */
    }
  }

  await heartbeat({
    phase: "done",
    digest_processed: digest.processed?.length ?? 0,
    repricing_processed: batch.processed?.length ?? 0,
    listing_sync_runs: listingSync.runs?.length ?? 0,
    reconciliation_checked: reconciliation.checked ?? 0,
    repricing_events: repricingProcessed,
  });

  console.log(
    JSON.stringify({
      worker_id: workerId,
      digest: digest.processed?.length ?? 0,
      repricing: batch.processed?.length ?? 0,
      listing_sync: listingSync.runs?.length ?? 0,
      reconciliation: reconciliation.checked ?? 0,
      repricing_events: repricingProcessed,
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
