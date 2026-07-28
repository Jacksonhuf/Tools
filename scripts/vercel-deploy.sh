#!/usr/bin/env bash
# Deploy mx-pricing to Vercel (monorepo: Vite SPA + Hono BFF serverless).
#
# Prerequisites:
#   - Vercel project linked to this repo (or run `npx vercel link` once)
#   - Root Directory = repo root (see docs/vercel-production-deploy.md)
#   - Optional: export VERCEL_TOKEN for non-interactive CI/local deploy
#
# Usage:
#   ./scripts/vercel-deploy.sh           # preview deployment
#   ./scripts/vercel-deploy.sh --prod    # production (validates secrets)

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROD_FLAG=""
if [[ "${1:-}" == "--prod" ]]; then
  PROD_FLAG="--prod"
  export DEPLOY_ENV="${DEPLOY_ENV:-production}"
  export PRODUCTION_MODE="${PRODUCTION_MODE:-true}"
  echo "==> Validating production environment"
  npm run vercel:check-env
fi

echo "==> Installing dependencies"
npm ci

echo "==> Building for Vercel"
npm run build:vercel

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "==> Running database migrations"
  npm run db:migrate
else
  if [[ -n "$PROD_FLAG" ]]; then
    echo "ERROR: DATABASE_URL is required for production deploy" >&2
    exit 1
  fi
  echo "==> DATABASE_URL not set; BFF will use in-memory catalog on serverless"
fi

VERCEL_ARGS=(deploy --yes ${PROD_FLAG})
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  VERCEL_ARGS+=(--token "$VERCEL_TOKEN")
fi

echo "==> Deploying to Vercel"
npx vercel@latest "${VERCEL_ARGS[@]}"

if [[ -n "$PROD_FLAG" ]]; then
  echo ""
  echo "==> Post-deploy: verify readiness and go-live APIs"
  echo "    See docs/vercel-production-deploy.md"
fi
