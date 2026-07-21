# PR / 合并就绪检查（Development Loop 32）

在合并 `cursor/prd-and-task-docs-1936` → `main` 前建议确认：

## 自动化

| 命令 | 说明 |
|------|------|
| `npm ci && npm run build && npm test` | 全量 Vitest（**109** 用例；PG 见 `ci-postgres-int` **6** 用例） |
| `npm run test:smoke` | API E2E 链（定价 + Copilot + digest + P3） |
| `npm run test:e2e` | Playwright（定价 + Copilot + Ops + 调价审批 + 渠道沙箱） |

GitHub Actions：

- `ci-unit-engine`、`ci-vitest-full`（`npm test` + `test:smoke`）
- `ci-e2e-smoke`（Playwright）
- `ci-postgres-int`（PostgreSQL service + `tests/int/postgres-bff-smoke.test.ts`）

## 里程碑 API

- `GET /api/v1/product/readiness` — `all_accepted: true` 表示 P3+P4 验收目录均为绿
- `GET /api/v1/agent/milestones` — 分项 `p3_readiness` / `p4_readiness`
- `GET /api/v1/channels/sandbox/status` + `.../events` — 渠道沙箱模式与事件账本
- `GET /api/v1/channels/adapters/status` — publish/pull 驱动（mock / http_stub）

## 文档

- [development-progress.md](./development-progress.md) — Loop 1–32 日志
- [p3-acceptance-checklist.md](./p3-acceptance-checklist.md)
- [p4-acceptance-checklist.md](./p4-acceptance-checklist.md)
- [channel-sandbox.md](./channel-sandbox.md)
- [channel-sandbox-production.md](./channel-sandbox-production.md)
- [channel-http-adapters.md](./channel-http-adapters.md)

## Demo 冒烟（本地）

```bash
npm run dev:bff   # :3000
npm run dev:web   # :5173，代理 /api
```

Header：`Authorization: Bearer dev-token`，`X-Tenant-Id: tenant-demo`

可选 PostgreSQL 全链路：

```bash
npm run db:up && npm run db:migrate
export DATABASE_URL=postgresql://mx:mx@localhost:5432/mx_pricing
RUN_PG_INTEGRATION=1 npx vitest run tests/int/postgres-bff-smoke.test.ts
```
