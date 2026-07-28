# 生产级开发任务清单 v2.0

| 属性 | 内容 |
|------|------|
| 关联 PRD | [PRD-mexico-cross-border-pricing.md](./PRD-mexico-cross-border-pricing.md) |
| 基线 | [development-task-list.md](./development-task-list.md) v1.1（MVP） |
| 状态 | Wave 1–8 已交付；Wave 0 本批 |

## 本批已交付（Prod Wave 1–3）

| ID | Task | 状态 |
|----|------|------|
| INFRA-04/10 | 生产启动校验 `PRODUCTION_MODE` + `assertProductionBoot` | ✅ |
| P0-E1-03 | JWT 主体解析 `tenant_id` / `roles` + RBAC 骨架 | ✅ |
| P0-E1-04a | 迁移 `012_production_stores`（idempotency/cost/fx/audit 等） | ✅ |
| P0-E1-04b | Redis 去抖后端（`REDIS_URL` + `repricing/debounce-redis`） | ✅ |
| P1-E1-03/04 | 真实 OAuth code exchange `POST .../oauth/callback` | ✅ |
| P1-E2-01/02 | `MercadoLibreAdapter` / `AmazonMxSpApiAdapter` | ✅ |
| P3-E2-01/02 | Live 渠道驱动 `CHANNEL_ADAPTER_DRIVER=live|mercadolibre|amazon_sp_api` | ✅ |
| P3-E2-06 | PG `publish_idempotency` 仓储 | ✅ |
| P0-E4-05 | PG `channel_publish_status` 列写入 | ✅ |
| P0-E1-05 | `repricing-event-worker` 脚本 | ✅ |
| X-01 | `GET /api/v1/production/readiness` | ✅ |

## 本批已交付（Prod Wave 4–5）

| ID | Task | 状态 |
|----|------|------|
| P0-E1-06 | 导出 PG 仓储 + S3 兼容对象存储（`EXPORT_S3_*`） | ✅ |
| P0-E1-04 | Worker heartbeat PG 仓储 | ✅ |
| P3-E3-01 | 对账定时 `POST /ops/reconciliation/run-due` | ✅ |
| P4-E1-04 | Agent tool audit PG 仓储（迁移 013） | ✅ |
| P3-E3-01 | Reconciliation alerts PG 仓储 | ✅ |
| X-05 | `audit_logs` 写入（审批等关键操作） | ✅ |
| P0-E1-03b | RBAC 门禁：审批 / 渠道写价 | ✅ |
| P0-E1-05 | async-worker 扩展：sync + recon + repricing events | ✅ |

## 本批已交付（Prod Wave 6）

| ID | Task | 状态 |
|----|------|------|
| P0-E1-04c | 迁移 `014_prod_wave6_catalog_digest`（tariff 列 + digest_jobs 对齐） | ✅ |
| P0-E1-04d | Cost sheet PG 仓储（`cost_sheets`） | ✅ |
| P0-E1-04e | FX rate PG 仓储（`fx_rates`） | ✅ |
| P0-E1-04f | Tariff HS PG 仓储（`tariff_rules`） | ✅ |
| P0-E1-04g | Digest job queue PG 仓储（`digest_jobs`） | ✅ |
| X-01 | `GET /production/readiness` 暴露 cost/fx/tariff/digest 驱动 | ✅ |

## 本批已交付（Prod Wave 7–8）

| ID | Task | 状态 |
|----|------|------|
| P4-E1-06 | 生产 LLM：`llm_http` 生产门禁 + `RULE_COMPILER_PRODUCTION_NO_FALLBACK` | ✅ |
| P5-06 / TC-NFR-PERF-001 | k6 基线脚本 + Node load baseline + `ci-nfr-weekly` 扩展 | ✅ |
| X-03 | 双周 `ci-security-scan` + 渗透清单 + 密钥模式扫描 | ✅ |
| TC-NFR-SEC-003 | 日志脱敏 `sanitizeForLog` + 自动化测试 | ✅ |
| GL-* | `GET /production/go-live` + `docs/go-live-checklist.md` | ✅ |

## 本批已交付（Prod Wave 0）

| ID | Task | 状态 |
|----|------|------|
| INFRA-01 | `DEPLOY_ENV` 环境分层（dev/staging/production） | ✅ |
| INFRA-02 | Secrets 注册表 + `scripts/secrets/validate-env.mjs` | ✅ |
| INFRA-03 | WAF 中间件（限流/安全头/IP 名单/路径拦截） | ✅ |
| INFRA-05 | 备份 PITR：`pg-backup` / `pg-restore-drill` + `ci-backup-drill` | ✅ |
| INFRA-06 | `docker-compose.staging.yml`（PG WAL + Redis） | ✅ |
| X-01 | readiness 暴露 deploy/secrets/waf/backup_pitr | ✅ |

## 下一批（待开发）

| 波次 | 关键 Task |
|------|-----------|
| Wave 2 | SKU/Cost Web 生产化、审批 RBAC 分角色 |

完整 153 项规划见 Cloud Agent 会话记录（2026-07-28）。

## 生产环境变量速查

```bash
DEPLOY_ENV=production
PRODUCTION_MODE=true
DATABASE_URL=postgresql://...
AUTH_DRIVER=oidc_jwt
OIDC_JWT_HS256_SECRET=... # 或 OIDC_JWKS_URL
SHOP_CREDENTIAL_ENCRYPTION_KEY=...
REDIS_URL=redis://...
CHANNEL_ADAPTER_DRIVER=live
CHANNEL_LIVE_ACKNOWLEDGED=true
ML_CLIENT_ID=... ML_CLIENT_SECRET=...
RULE_COMPILER_DRIVER=llm_http
RULE_COMPILER_LLM_ENDPOINT=https://...
RULE_COMPILER_LLM_API_KEY=...
RULE_COMPILER_PRODUCTION_NO_FALLBACK=true
```

## 门禁

```bash
npm ci && npm run build && npm test
npm run test:e2e
```
