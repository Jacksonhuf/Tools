# Security Scan Checklist (X-03)

Bi-weekly security gate for MX Pricing production. Automated via `.github/workflows/ci-security-scan.yml`.

## Automated gates

| Check | Tool | Cadence |
|-------|------|---------|
| Dependency audit | `npm audit --audit-level=high` | Bi-weekly + manual |
| Secret pattern scan | `node scripts/security/scan-secrets.mjs` | Bi-weekly + manual |
| TC-NFR-SEC-003 | `tests/api/security-log-redaction.test.ts` | CI |
| TC-NFR-SEC-004 | `tests/api/agent-tools.test.ts` | CI |

## Manual penetration checklist

- [ ] OAuth callback rejects forged `state` / cross-tenant shop binding
- [ ] `dev-token` rejected when `PRODUCTION_MODE=true`
- [ ] Shop credentials stored encrypted (`SHOP_CREDENTIAL_ENCRYPTION_KEY`)
- [ ] Agent catalog has no publish/apply tools (TC-NFR-SEC-004)
- [ ] Logs do not contain `refresh_token`, `access_token`, or Bearer JWT literals (TC-NFR-SEC-003)
- [ ] Export downloads require tenant auth headers
- [ ] RBAC enforced on approve and channel publish routes

## Run locally

```bash
npm run security:scan
npm test -- tests/api/security-log-redaction.test.ts tests/api/agent-tools.test.ts
```

## Remediation

1. Record findings in the release ticket.
2. Block go-live if any P0 item fails (`docs/go-live-checklist.md`).
3. Re-run `workflow_dispatch` on `ci-security-scan` after fixes.
