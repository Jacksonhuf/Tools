# Repricing batch shards (P5-05 / Loop 44–45)

Horizontally partition repricing work per SKU listing using a stable SHA-256 hash of `listing_id`. Workers can claim `shard_index` in `[0, shard_total)` and process only pending repricing events for listings in that bucket.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/skus/{skuId}/repricing-batch/shard-plan?shard_total=N` | Plan listing IDs per shard (default `N=2`, max 64) |
| POST | `/api/v1/skus/{skuId}/repricing-batch/recompute` | Process pending events for one shard |
| POST | `/api/v1/skus/{skuId}/repricing-batch/recompute-all` | Run every shard for one SKU (Loop 45) |
| POST | `/api/v1/repricing-batch/recompute-all` | Run all shards for each tenant SKU (optional `sku_ids`) |

### Single-shard recompute body

```json
{
  "shard_index": 0,
  "shard_total": 4
}
```

### Orchestrated recompute body

```json
{
  "shard_total": 4,
  "sku_ids": ["demo-sku-001"]
}
```

Omit `sku_ids` on the tenant route to fan out across `catalog.listSkus`.

### Response (recompute)

- `processed[]` — events handled (`result` is version `state` or `skipped:<reason>`)
- `skipped[]` — listings with no pending events or per-event errors

`recompute-all` responses add per-shard or per-SKU aggregates under `shards` / `skus` and `totals`.

## External worker (Loop 45)

```bash
npm run dev:bff
BFF_BASE_URL=http://127.0.0.1:3000 REPRICING_SHARD_TOTAL=4 npm run repricing-batch:worker
```

| Env | Default | Meaning |
|-----|---------|---------|
| `BFF_BASE_URL` | `http://127.0.0.1:3000` | BFF origin |
| `BFF_AUTH_TOKEN` | `dev-token` | Bearer token |
| `X_TENANT_ID` | `tenant-demo` | Tenant header |
| `REPRICING_SHARD_TOTAL` | `4` | Shard count |
| `REPRICING_SKU_ID` | _(unset)_ | If set, SKU-scoped orchestration |
| `REPRICING_WORKER_MODE` | `orchestrated` | `orchestrated`, `per_shard`, or `queue` (Loop 48) |

Implementation: `tools/repricing-batch-worker/run.mjs`. Job queue: [repricing-batch-queue.md](./repricing-batch-queue.md).

## Auth

Same as other BFF routes: `Authorization: Bearer dev-token`, `X-Tenant-Id: tenant-demo`.

## Tests

- `tests/api/repricing-batch-shard.test.ts` — TC-API-REPR-BATCH-001/002/003
- `tests/api/repricing-batch-job-queue.test.ts` — TC-API-REPR-BATCH-004

## Out of scope

- PostgreSQL-backed queue / multi-process lease
- Production autoscaler wiring
