# Staging Deploy Runbook (Post-Merge Ops)

Operational guide after merging the production platform stack (PR #79).

## Prerequisites

- Docker with Compose v2
- Node.js 20+
- `config/env.staging.example` copied to a local env file (never commit secrets)

## 1. Bootstrap staging stack

```bash
npm ci
npm run staging:bootstrap
```

This will:

1. Create `backups/wal-archive` for WAL archiving
2. Start `docker-compose.staging.yml` (Postgres on **5433**, Redis on **6380**)
3. Run migrations `012`–`014` and seed demo data
4. Validate staging secrets (`npm run secrets:validate`)

For CI or external Postgres/Redis:

```bash
node scripts/staging/bootstrap.mjs --skip-docker
```

## 2. Start BFF with staging profile

```bash
export $(grep -v '^#' config/env.staging.example | xargs)
npm run dev:bff
```

Or load your own env file:

```bash
STAGING_ENV_FILE=.env.staging npm run dev:bff
```

## 3. Smoke verification

With BFF running on port 3000:

```bash
npm run staging:smoke
```

Auto-start BFF for a one-shot check:

```bash
npm run staging:smoke:start
```

Endpoints verified:

| Endpoint | Expectation |
|----------|-------------|
| `GET /health` | 200 |
| `GET /api/v1/production/readiness` | `deploy_env=staging` |
| `GET /api/v1/production/go-live` | checklist present |
| `GET /api/v1/ops/backup/status` | `deploy_env=staging` |
| `GET /api/v1/auth/me` | JWT principal + permissions |
| `GET /api/v1/skus/demo-sku-001/pricing-context` | demo SKU from PG |

Staging uses `AUTH_DRIVER=oidc_jwt`; smoke signs an HS256 JWT with `OIDC_JWT_HS256_SECRET`.

## 4. CI

`.github/workflows/ci-staging-smoke.yml` runs bootstrap (skip docker) + `tests/int/staging-smoke.test.ts` on every push/PR.

## 5. Production cutover

After staging is green:

1. Configure [config/env.production.example](../config/env.production.example) in your secret manager
2. Run `npm run secrets:validate` with `DEPLOY_ENV=production`
3. Deploy via [scripts/vercel-deploy.sh](../scripts/vercel-deploy.sh) or your platform
4. Verify [go-live-checklist.md](./go-live-checklist.md) gates

## Related docs

- [infra-environments.md](./infra-environments.md)
- [go-live-checklist.md](./go-live-checklist.md)
- [backup-pitr-runbook.md](./backup-pitr-runbook.md)
