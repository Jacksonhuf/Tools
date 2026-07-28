# Infrastructure Environments (Wave 0)

## Deploy environments

| `DEPLOY_ENV` | Purpose | WAF | Secrets gate |
|--------------|---------|-----|--------------|
| `development` | Local dev | Off | Relaxed |
| `staging` | Pre-prod integration | On | DATABASE_URL + JWT |
| `production` | Live | On | Full secret registry |

Set `DEPLOY_ENV` explicitly; do not rely on `NODE_ENV` alone.

## Profile files

- [config/env.staging.example](../config/env.staging.example)
- [config/env.production.example](../config/env.production.example)
- [.env.example](../.env.example)

## Secrets validation

```bash
# Load env file then validate
export $(grep -v '^#' config/env.staging.example | xargs)  # example only
node scripts/secrets/validate-env.mjs
```

GitHub Actions / Vercel: store secrets in the platform secret manager; never commit values.

## WAF

Application-layer WAF middleware (staging/production):

- Rate limiting (`WAF_RATE_LIMIT_PER_MINUTE`, default 300)
- Max body size (`WAF_MAX_BODY_BYTES`, default 1MB)
- IP allowlist/blocklist (`WAF_IP_ALLOWLIST`, `WAF_IP_BLOCKLIST`)
- Security headers (HSTS delegated to CDN; nosniff, frame deny, referrer policy)
- Suspicious path blocking

Edge WAF (Cloudflare / AWS WAF) should be configured separately for DDoS and bot protection.

## Staging stack

See [staging-deploy-runbook.md](./staging-deploy-runbook.md) for the full post-merge flow.

```bash
npm run staging:bootstrap
export $(grep -v '^#' config/env.staging.example | xargs)
npm run dev:bff
npm run staging:smoke
```

## Readiness APIs

| Endpoint | Content |
|----------|---------|
| `GET /api/v1/production/readiness` | Includes `deploy`, `secrets`, `waf`, `backup_pitr` |
| `GET /api/v1/ops/backup/status` | Backup/PITR status only |
| `GET /api/v1/production/go-live` | Includes INFRA-* checks |

## Backup & PITR

See [backup-pitr-runbook.md](./backup-pitr-runbook.md).
