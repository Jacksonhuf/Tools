# 生产级开发任务清单 v2.0

| 属性 | 内容 |
|------|------|
| 关联 PRD | [PRD-mexico-cross-border-pricing.md](./PRD-mexico-cross-border-pricing.md) |
| 基线 | [development-task-list.md](./development-task-list.md) v1.1（MVP） |
| 状态 | Wave 1–3 首批实现已合入（见下方） |

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

## 下一批（待开发）

| 波次 | 关键 Task |
|------|-----------|
| Wave 0 | staging/prod 环境、Secrets、WAF、备份 PITR |
| Wave 1 | 强制 PG 全仓储、对象存储导出、ci-int-pricing 扩展 |
| Wave 2 | SKU/Cost Web 生产化、审批 RBAC 分角色 |
| Wave 4–5 | 真实采集 Worker、SMTP digest、对账定时任务 |
| Wave 6–8 | 生产 LLM、NFR k6 基线、安全扫描 X-03、上线 GL-* |

完整 153 项规划见 Cloud Agent 会话记录（2026-07-28）。

## 生产环境变量速查

```bash
PRODUCTION_MODE=true
DATABASE_URL=postgresql://...
AUTH_DRIVER=oidc_jwt
OIDC_JWT_HS256_SECRET=... # 或 OIDC_JWKS_URL
SHOP_CREDENTIAL_ENCRYPTION_KEY=...
REDIS_URL=redis://...
CHANNEL_ADAPTER_DRIVER=live
CHANNEL_LIVE_ACKNOWLEDGED=true
ML_CLIENT_ID=... ML_CLIENT_SECRET=...
AMAZON_LWA_APP_ID=... AMAZON_LWA_CLIENT_SECRET=...
```

## 门禁

```bash
npm ci && npm run build && npm test
npm run test:e2e
```
