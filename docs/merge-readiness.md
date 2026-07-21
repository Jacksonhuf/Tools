# PR / 合并就绪检查（Development Loop 27）

在合并 `cursor/prd-and-task-docs-1936` → `main` 前建议确认：

## 自动化

| 命令 | 说明 |
|------|------|
| `npm ci && npm run build && npm test` | 全量 Vitest（当前 **100+** 用例） |
| `npm run test:smoke` | API E2E 链（定价 + Copilot + digest） |
| `npm run test:e2e` | Playwright（定价双列 + Copilot + Ops） |

GitHub Actions：`ci-unit-engine`、`ci-e2e-smoke`（Loop 27 起 `ci-vitest-full` 跑全量 `npm test`）。

## 里程碑 API

- `GET /api/v1/product/readiness` — `all_accepted: true` 表示 P3+P4 验收目录均为绿
- `GET /api/v1/agent/milestones` — 分项 `p3_readiness` / `p4_readiness`

## 文档

- [development-progress.md](./development-progress.md) — Loop 1–27 日志
- [p3-acceptance-checklist.md](./p3-acceptance-checklist.md)
- [p4-acceptance-checklist.md](./p4-acceptance-checklist.md)

## Demo 冒烟（本地）

```bash
npm run dev:bff   # :3000
npm run dev:web   # :5173，代理 /api
```

Header：`Authorization: Bearer dev-token`，`X-Tenant-Id: tenant-demo`
