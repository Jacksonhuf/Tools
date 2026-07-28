# Go-Live Checklist (GL Gate)

Production release gate tying golden tests, NFR baselines, security scans, and readiness APIs.

## Infrastructure (Wave 0)

See [infra-environments.md](./infra-environments.md) and [backup-pitr-runbook.md](./backup-pitr-runbook.md).

- [ ] `DEPLOY_ENV=production` with secrets validated (`npm run secrets:validate`)
- [ ] WAF enabled (`WAF_ENABLED=true`)
- [ ] Backup/PITR configured (`GET /api/v1/ops/backup/status` green)

## API gates

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/production/readiness` | Infra + store drivers + LLM status |
| `GET /api/v1/production/go-live` | Consolidated go-live checklist |
| `GET /api/v1/product/readiness` | P3/P4/P5 milestone acceptance |

All three should report `ready: true` before production cutover.

## Golden tests (GL-*)

Run the pricing-engine golden fixtures mapped in `tests/golden/manifest.json`:

```bash
npm run test:golden
```

| Golden ID | Domain |
|-----------|--------|
| GL-COST-001–006 | Landed cost, forward/reverse, IVA, rounding |
| GL-COMP-001–004, 006 | Competitive pricing |
| GL-FLOOR-001–002 | Per-channel floor |

## NFR baseline (k6)

Weekly workflow: `.github/workflows/ci-nfr-weekly.yml`

| Test case | Threshold | Script |
|-----------|-----------|--------|
| TC-NFR-PERF-001 | P95 &lt; 3s @ 100 VU (staging) | `scripts/k6/pricing-context.js` |
| TC-NFR-PERF-002 scaffold | simulate &lt; 3s local | `scripts/k6/pricing-simulate.js` |

Local quick check:

```bash
npm run build
npm run nfr:baseline
```

## Security (X-03)

See [security-scan-checklist.md](./security-scan-checklist.md).

## Production LLM

When `RULE_COMPILER_DRIVER=llm_http` in production:

- Set `RULE_COMPILER_LLM_ENDPOINT` and `RULE_COMPILER_LLM_API_KEY`
- `RULE_COMPILER_PRODUCTION_NO_FALLBACK=true` (default in production) — no silent heuristic fallback
- Contract: [llm-rule-compiler-contract.md](./llm-rule-compiler-contract.md)

## Standard release command block

```bash
npm ci
npm run build
npm run test:golden
npm test
npm run test:e2e
npm run security:scan
```

## Sign-off

- [ ] `production/readiness` green in target environment
- [ ] `production/go-live` green
- [ ] `product/readiness` milestones accepted
- [ ] Version backup drill documented ([version-backup-restore.md](./version-backup-restore.md))
- [ ] On-call runbook updated
