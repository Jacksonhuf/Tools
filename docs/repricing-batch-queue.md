# Repricing batch job queue (Loop 48)

In-memory durable-style queue for tenant-wide or SKU-scoped repricing batch runs (same execution as `recompute-all`, but **enqueue** then **process** for worker polling).

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/repricing-batch/jobs/enqueue` | Create job (`scope`: `tenant` \| `sku`) |
| GET | `/api/v1/repricing-batch/jobs` | List jobs (`?limit=`) |
| GET | `/api/v1/repricing-batch/jobs/{jobId}` | Job detail + result |
| POST | `/api/v1/repricing-batch/jobs/process` | Process up to `limit` queued jobs |

### Enqueue body

```json
{
  "scope": "tenant",
  "shard_total": 4,
  "sku_ids": ["demo-sku-001"]
}
```

SKU scope:

```json
{
  "scope": "sku",
  "sku_id": "demo-sku-001",
  "shard_total": 4
}
```

## Ops

`GET /api/v1/ops/metrics` includes `repricing_batch_queue: { total, queued, failed }`.

## Worker

```bash
REPRICING_WORKER_MODE=queue npm run repricing-batch:worker
```

## Tests

`tests/api/repricing-batch-job-queue.test.ts` — TC-API-REPR-BATCH-004

## Limits

- Process-local memory queue (not PostgreSQL); resets on BFF restart.
- No cross-process lease / idempotency keys yet.
