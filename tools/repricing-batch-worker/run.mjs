#!/usr/bin/env node
/**
 * External repricing batch worker (Loop 45).
 * Calls BFF shard APIs — run beside `npm run dev:bff`.
 */
const baseUrl = (process.env.BFF_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
);
const token = process.env.BFF_AUTH_TOKEN ?? "dev-token";
const tenantId = process.env.X_TENANT_ID ?? "tenant-demo";
const shardTotal = Number.parseInt(process.env.REPRICING_SHARD_TOTAL ?? "4", 10);
const skuId = process.env.REPRICING_SKU_ID;

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
    throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function runSkuScoped() {
  const plan = await request(
    `/api/v1/skus/${skuId}/repricing-batch/shard-plan?shard_total=${shardTotal}`
  );
  const results = [];
  for (const shard of plan.shards) {
    if (!shard.listing_ids?.length) continue;
    const out = await request(
      `/api/v1/skus/${skuId}/repricing-batch/recompute`,
      {
        method: "POST",
        body: JSON.stringify({
          shard_index: shard.shard_index,
          shard_total: shardTotal,
        }),
      }
    );
    results.push(out);
  }
  return { mode: "per_shard", sku_id: skuId, shard_total: shardTotal, results };
}

async function runOrchestrated() {
  if (skuId) {
    return request(`/api/v1/skus/${skuId}/repricing-batch/recompute-all`, {
      method: "POST",
      body: JSON.stringify({ shard_total: shardTotal }),
    });
  }
  return request("/api/v1/repricing-batch/recompute-all", {
    method: "POST",
    body: JSON.stringify({ shard_total: shardTotal }),
  });
}

async function runQueued() {
  const scope = skuId ? "sku" : "tenant";
  const body = { scope, shard_total: shardTotal };
  if (skuId) body.sku_id = skuId;
  const { job } = await request("/api/v1/repricing-batch/jobs/enqueue", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const out = await request("/api/v1/repricing-batch/jobs/process", {
    method: "POST",
    body: JSON.stringify({ limit: 5 }),
  });
  return { mode: "queue", job_id: job.job_id, ...out };
}

async function main() {
  const mode = (process.env.REPRICING_WORKER_MODE ?? "orchestrated").toLowerCase();
  if (!Number.isFinite(shardTotal) || shardTotal < 1 || shardTotal > 64) {
    console.error("REPRICING_SHARD_TOTAL must be 1..64");
    process.exit(1);
  }
  let summary;
  if (mode === "queue") {
    summary = await runQueued();
  } else if (mode === "per_shard" && skuId) {
    summary = await runSkuScoped();
  } else {
    summary = await runOrchestrated();
  }
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
