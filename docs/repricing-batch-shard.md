# Repricing batch shards (P5-05 / Loop 44)

Horizontally partition repricing work per SKU listing using a stable SHA-256 hash of `listing_id`. Workers can claim `shard_index` in `[0, shard_total)` and process only pending repricing events for listings in that bucket.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/skus/{skuId}/repricing-batch/shard-plan?shard_total=N` | Plan listing IDs per shard (default `N=2`, max 64) |
| POST | `/api/v1/skus/{skuId}/repricing-batch/recompute` | Process pending events for one shard |

### Recompute body

```json
{
  "shard_index": 0,
  "shard_total": 4
}
```

### Response (recompute)

- `processed[]` — events handled (`result` is version `state` or `skipped:<reason>`)
- `skipped[]` — listings with no pending events or per-event errors

## Auth

Same as other BFF routes: `Authorization: Bearer dev-token`, `X-Tenant-Id: tenant-demo`.

## Tests

- `tests/api/repricing-batch-shard.test.ts` — TC-API-REPR-BATCH-001/002

## Out of scope (this loop)

- External job queue / worker deployment
- Cross-SKU fan-out (plan is per SKU via fixture listings)
