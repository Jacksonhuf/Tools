#!/usr/bin/env node
/**
 * Repricing event worker — flush debounce windows and process pending repricing events.
 */
const baseUrl = (process.env.BFF_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
);
const token = process.env.BFF_AUTH_TOKEN ?? "dev-token";
const tenantId = process.env.X_TENANT_ID ?? "tenant-demo";
const workerId = process.env.REPRICING_EVENT_WORKER_ID ?? "repricing-event-worker-1";
const listingIds = (process.env.REPRICING_LISTING_IDS ?? "listing-ml-001,listing-amz-001")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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

async function main() {
  await request("/api/v1/ops/workers/heartbeat", {
    method: "POST",
    body: JSON.stringify({
      worker_id: workerId,
      details: { mode: "repricing-event", phase: "start" },
    }),
  });

  const flushed = [];
  for (const listingId of listingIds) {
    try {
      await request(`/api/v1/listings/${listingId}/ingest/run`, { method: "POST" });
    } catch {
      /* ingest optional per listing */
    }
    const event = await request(
      `/api/v1/listings/${listingId}/repricing-events/flush`,
      { method: "POST" }
    );
    if (event?.event?.id) {
      await request(`/api/v1/repricing-events/${event.event.id}/process`, {
        method: "POST",
      });
      flushed.push(event.event.id);
    }
  }

  await request("/api/v1/ops/workers/heartbeat", {
    method: "POST",
    body: JSON.stringify({
      worker_id: workerId,
      details: { mode: "repricing-event", phase: "done", processed: flushed.length },
    }),
  });

  console.log(
    JSON.stringify({ worker_id: workerId, processed_events: flushed.length, events: flushed })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
