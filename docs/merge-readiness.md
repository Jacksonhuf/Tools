# PR / 合并就绪检查（Development Loop 36 — 收官）

在合并 `cursor/prd-and-task-docs-1936` → `main` 前建议确认：

## 自动化

| 命令 | 说明 |
|------|------|
| `npm ci && npm run build && npm test` | 全量 Vitest（**111** 用例；PG 见 `ci-postgres-int` **6** 用例） |
| `npm run test:smoke` | API E2E 链（定价 + Copilot + digest + P3） |
| `npm run test:e2e` | Playwright（含 Ops metrics TC） |

GitHub Actions：`ci-unit-engine`、`ci-vitest-full`、`ci-e2e-smoke`、`ci-postgres-int`。

## 里程碑 API

- `GET /api/v1/product/readiness` — P3+P4 验收
- `GET /api/v1/agent/milestones`
- `GET /api/v1/channels/sandbox/status` + `.../events`
- `GET /api/v1/channels/adapters/status`
- `GET /api/v1/ops/metrics` — 运维指标快照（P5 脚手架）

## 文档

- [development-progress.md](./development-progress.md) — Loop 1–36
- [development-loop-closure.md](./development-loop-closure.md) — **收官说明**
- [p3-acceptance-checklist.md](./p3-acceptance-checklist.md) / [p4-acceptance-checklist.md](./p4-acceptance-checklist.md)
- [p5-acceptance-checklist.md](./p5-acceptance-checklist.md)
- 渠道：[channel-sandbox.md](./channel-sandbox.md)、[channel-http-adapters.md](./channel-http-adapters.md)

## 本地 sidecar（可选）

```bash
npm run dev:channel-gateway
export CHANNEL_ADAPTER_DRIVER=http_stub
export CHANNEL_HTTP_PUBLISH_URL=http://127.0.0.1:8787/publish
```

## Demo

`Authorization: Bearer dev-token`，`X-Tenant-Id: tenant-demo`
