# Development Loop 进度文档

| 属性 | 内容 |
|------|------|
| 关联 PRD | [PRD-mexico-cross-border-pricing.md](./PRD-mexico-cross-border-pricing.md) |
| 关联 SDD | [solution-design.md](./solution-design.md) |
| 关联任务 | [development-task-list.md](./development-task-list.md) |
| 关联测试 | [test-cases.md](./test-cases.md) |

## Development Loop 约定

每一轮循环按以下顺序执行，并在本文 **迭代日志** 中记录：

1. **读文档**：PRD + SDD + 任务清单（本轮目标 Story ID）
2. **开发**：实现代码，范围对齐 SDD 章节
3. **测试**：运行对应用例 / 黄金用例 / CI
4. **更新进度**：本文迭代日志 + 任务清单状态 + 必要时更新 SDD/OpenAPI

---

## 总体里程碑

| 阶段 | 状态 | 说明 |
|------|------|------|
| P0 定价内核 | 进行中 | Loop 1–2：引擎 + BFF simulate |
| P1 双通道 | 未开始 | — |
| P2 竞品 | 未开始 | — |
| P3 回写 | 未开始 | — |
| P4 Agent | 未开始 | — |

---

## 任务完成快照（滚动更新）

| 任务 ID | 状态 | 最近 Loop |
|---------|------|-----------|
| DOC-02 | 部分 | Loop 2（`openapi/v1.yaml` 核心路径） |
| DOC-03 | 完成 | Loop 1 |
| P0-E1-01 | 部分 | Loop 2（`apps/bff` + workspaces） |
| P0-E1-02 | 部分 | Loop 2（BFF 路由、401、health） |
| P0-E1-03 | 部分 | Loop 2（Bearer + X-Tenant-Id） |
| P0-E1-07 | 完成 | Loop 1 |
| P0-E2-05 | 完成 | Loop 1 |
| P0-E3-02 | 部分 | Loop 1 |
| P0-E3-04 | 部分 | Loop 1 |
| P0-E4-01 | 完成 | Loop 1 |
| P0-E4-02 | 完成 | Loop 1 |
| P0-E4-03 | 完成 | Loop 1 |
| P0-E4-04 | 部分 | Loop 2（BFF 简化 waterfall） |
| P0-E4-06 | 部分 | Loop 1 |
| P0-E4-07 | 完成 | Loop 2 |
| P0-E6-03 | 完成 | Loop 2 |
| P0-E7-01 | 完成 | Loop 1 |
| P0-E7-02 | 完成 | Loop 1 |
| P0-E7-03 | 完成 | Loop 1 |
| P0-E8-03 | 部分 | Loop 2（`tests/api/bff.test.ts`） |

---

## 迭代日志

### Loop 1 — 定价引擎核心（P0-E4 / P0-E7）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-20 |
| **阅读** | SDD §6 定价引擎、§7 瀑布层；test-cases §2–4；任务 P0-E4-01–03、P0-E7 |
| **实现** | `packages/pricing-engine`；Vitest 黄金用例；`ci-unit-engine` |
| **测试** | `npm run test:golden` — 14 passed |
| **下一步** | BFF + i18n |

### Loop 2 — BFF 定价上下文与模拟（P0-E4-07 / P0-E6-03）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-20 |
| **阅读** | SDD §10 API；test-cases §5、§11；任务 P0-E4-07、P0-E6-03、P0-E1-02 |
| **实现** | `packages/i18n-format`；`apps/bff`（Hono）：`GET pricing-context`、`POST simulate`；内存 `version-store`（simulate 不写库）；`openapi/v1.yaml` |
| **测试** | `npm test` — **21 passed**（golden 14 + i18n 2 + API 5） |
| **下一步** | Loop 3：`POST price-versions` + 内存/PostgreSQL Version（P0-E4-05、P0-E5-05）；或 Web SPA 瀑布页（P0-E6-05） |

---

## 本地命令

```bash
npm ci && npm run build && npm test
npm run start -w @mx-pricing/bff   # PORT=3000, Bearer dev-token
```

Demo：`GET /api/v1/skus/demo-sku-001/pricing-context` + `X-Tenant-Id: tenant-demo`

---

## 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-07-20 | Loop 1 |
| v1.1 | 2026-07-20 | Loop 2 |
