# Vercel Production Deployment

Deploy the mx-pricing monorepo (Vite SPA + Hono BFF serverless) to Vercel production.

## Project settings (one-time)

| Setting | Value |
|---------|-------|
| **Root Directory** | Repository root (leave **empty** — do not set `apps/bff`) |
| **Framework Preset** | Other |
| **Build Command** | `npm run build:vercel` (from `vercel.json`) |
| **Output Directory** | `apps/web/dist` |
| **Install Command** | `npm ci` |

If Root Directory is set to `apps/bff`, builds fail by design (`apps/bff/vercel.json` guard).

## Environment variables

1. Open **Settings → Environment Variables → Production**
2. Add every key from [config/vercel.env.production.example](../config/vercel.env.production.example)
3. Mark secrets as **Sensitive**
4. Validate locally before deploy:

```bash
export $(grep -v '^#' config/env.production.example | xargs)  # example only
npm run vercel:check-env
```

## Deploy methods

### A. Vercel Git integration (recommended)

Connect the GitHub repo; Vercel deploys on push to `main`. Ensure production env vars are set before the first production deploy.

### B. CLI / script

```bash
# Preview
npm run deploy:vercel

# Production (requires DEPLOY_ENV=production + secrets)
export DEPLOY_ENV=production PRODUCTION_MODE=true
export DATABASE_URL=...  # and other vars from vercel.env.production.example
npm run deploy:vercel:prod
```

`scripts/vercel-deploy.sh --prod` runs `npm run vercel:check-env` and aborts if secrets are missing.

### C. GitHub Actions

Workflow: [`.github/workflows/deploy-vercel.yml`](../.github/workflows/deploy-vercel.yml)

Required repository secrets:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | Team/org ID |
| `VERCEL_PROJECT_ID` | Project ID |
| `DATABASE_URL` | Migrations at deploy time |

Trigger manually: **Actions → deploy-vercel → Run workflow**.

## Database migrations

Migrations run when `DATABASE_URL` is set during deploy (`scripts/vercel-deploy.sh` and `deploy-vercel.yml`). For Git-only deploys without Actions, run migrations separately:

```bash
DATABASE_URL=postgresql://... npm run db:migrate
```

## Post-deploy verification

Replace `https://your-app.vercel.app` with your production URL:

```bash
export BFF_BASE_URL=https://your-app.vercel.app
export DEPLOY_ENV=production
# Use a real JWT signed with production OIDC_JWT_HS256_SECRET
npm run staging:smoke   # same script; set BFF_BASE_URL + JWT env
```

Or call readiness APIs:

```bash
curl -sS -H "Authorization: Bearer $JWT" -H "X-Tenant-Id: tenant-demo" \
  https://your-app.vercel.app/api/v1/production/readiness | jq .
curl -sS -H "Authorization: Bearer $JWT" -H "X-Tenant-Id: tenant-demo" \
  https://your-app.vercel.app/api/v1/production/go-live | jq .
```

See [go-live-checklist.md](./go-live-checklist.md) for full cutover gates.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `FUNCTION_INVOCATION_TIMEOUT` on `/api/*` | Set `VERCEL_USE_PG=1` + valid `DATABASE_URL` for Postgres; otherwise the handler defaults to in-memory stores on Vercel. |
| `FUNCTION_INVOCATION_FAILED` on `/api/*` | Redeploy after `npm run build:vercel` (bundles `api/[...path].mjs` as **ESM**). Do **not** rewrite `/api/*` to `/api` — that strips the request path. Use `curl …/api/v1/ping` for a fast health check. Ensure production env vars from `config/vercel.env.production.example` are set. |
| `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` on many pages | API requests are hitting SPA `index.html`. Ensure root `vercel.json` rewrites `/api/*` before SPA fallback; run BFF locally with `npm run dev:bff` (or use `vite preview` with BFF on :3000). |
| Build fails with Root Directory error | Clear Root Directory in Vercel settings |
| 401 on all API routes | Set `AUTH_DRIVER=oidc_jwt` and JWT secret; use real Bearer JWT in production |
| In-memory catalog | Set `DATABASE_URL` in Vercel production env |
| `production/readiness` not ready | Run `npm run vercel:check-env` locally with same env |

## Related

- [staging-deploy-runbook.md](./staging-deploy-runbook.md)
- [infra-environments.md](./infra-environments.md)
- [go-live-checklist.md](./go-live-checklist.md)
