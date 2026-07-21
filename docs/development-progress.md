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
| P0 定价内核 | 进行中 | Loop 5：PostgreSQL 持久化 |
| P1 双通道 | 进行中 | Loop 9：OAuth 占位 |
| P2 竞品 | 进行中 | Loop 11：事件与 mock 采集 |
| P3 回写 | 未开始 | — |
| P4 Agent | 未开始 | — |

---

## 任务完成快照（滚动更新）

| 任务 ID | 状态 | 最近 Loop |
|---------|------|-----------|
| DOC-02 | 部分 | Loop 2（`openapi/v1.yaml` 核心路径） |
| DOC-03 | 完成 | Loop 1 |
| P0-E1-04 | 部分 | Loop 5（`packages/db` + docker-compose） |
| P0-E2-01 | 部分 | Loop 6（list + PATCH landed） |
| P0-E6-06 | 完成 | Loop 6 |
| P1-E3-05 | 部分 | Loop 6（Web 双列） |
| P0-E4-05 | 部分 | Loop 5（PG `price_versions`） |
| P0-E8-02 | 部分 | Loop 5（`tests/int/postgres-catalog`） |
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
| P0-E4-05 | 部分 | Loop 3（内存 Version + supersede） |
| P0-E4-06 | 部分 | Loop 1 |
| P0-E4-07 | 完成 | Loop 2 |
| P0-E5-01 | 完成 | Loop 7 |
| P0-E5-02 | 部分 | Loop 7（降幅 5% 审批） |
| P0-E6-01 | 部分 | Loop 4（Vite + React） |
| P0-E6-02 | 部分 | Loop 4（zh/en/es-MX） |
| P0-E6-05 | 完成 | Loop 4 |
| P0-E6-06 | 部分 | Loop 4（竞争模式表单） |
| P0-E7-01 | 完成 | Loop 1 |
| P0-E7-02 | 完成 | Loop 1 |
| P0-E7-03 | 完成 | Loop 1 |
| P0-E6-07 | 部分 | Loop 8（调价单 Web） |
| P1-E1-02 | 部分 | Loop 9（加密凭证表 + 仓储） |
| P1-E1-03 | 部分 | Loop 9（ML OAuth URL 占位 + mock） |
| P1-E1-04 | 部分 | Loop 9（Amazon LWA URL 占位 + mock） |
| P1-E2-01 | 部分 | Loop 9（MockChannelListingAdapter.pullListing） |
| P2-E1-01 | 部分 | Loop 10（Competitor Offer CRUD） |
| P2-E1-03 | 部分 | Loop 10（手工 price_observations） |
| P2-E1-04 | 部分 | Loop 10（median anchor 汇总） |
| P2-E2-01 | 部分 | Loop 11（Tier 调度 + mock ingest） |
| P2-E3-01 | 部分 | Loop 11（CompetitorPriceChanged 入队） |
| P2-E3-04 | 部分 | Loop 11（process → suggested version） |
| P2-E3-03 | 部分 | Loop 12（dynamic rule CRUD） |
| P2-E2-05 | 部分 | Loop 12（stale 检测与冻结） |
| P3-E1-01 | 部分 | Loop 13（cooldown / daily_limit） |
| P3-E2-01 | 部分 | Loop 13（ML publishPrice mock） |
| P3-E2-05 | 部分 | Loop 13（publish 失败熔断 rule） |

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
| **下一步** | Loop 3：Version 发布 |

### Loop 3 — Price Version 发布（P0-E4-05 / P0-E5-05）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-20 |
| **阅读** | SDD §5.5、§10.3；test-cases §5 TC-INT-VER-002 |
| **实现** | `POST /api/v1/listings/{listingId}/price-versions`；Guard 422；`version-store` supersede；`pricing-context` 读 active version |
| **测试** | `npm test` — **24 passed** |
| **下一步** | Loop 4：Web UI |

### Loop 4 — Web 瀑布与三语（P0-E6-01 / P0-E6-05）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-20 |
| **阅读** | SDD §11；任务 P0-E6-01、02、05、06 |
| **实现** | `apps/web`（Vite + React + i18next）：定价页、瀑布图、毛利滑杆/竞品价、模拟与发布；BFF CORS；`tests/web/waterfall.test.ts` |
| **测试** | `npm test` — **26 passed**；`npm run build` 含 web |
| **下一步** | Loop 5：PostgreSQL |

### Loop 5 — PostgreSQL 与仓储层（P0-E1-04 / P0-E4-05）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-20 |
| **阅读** | SDD §5.1、§5.3、§5.5 |
| **实现** | `packages/db`、`CatalogRepository`、docker-compose、BFF 启动 migrate+seed |
| **测试** | `npm test` — **28 passed**（含 pg-mem 集成） |
| **下一步** | Loop 6：SKU API + 双列 UI |

### Loop 6 — SKU CRUD 与双渠道瀑布（P0-E2-01 / P1-E3-05）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-20 |
| **阅读** | SDD §5.1、§9.3；任务 P0-E2-01、P1-E3-05、P0-E6-06 |
| **实现** | `GET/PATCH /api/v1/skus`；Amazon listing seed；Web 双列 ML/Amazon、`ChannelPricingColumn`、分渠道竞品价与发布 |
| **测试** | `npm test` — **31 passed** |
| **下一步** | Loop 7：调价单 |

### Loop 7 — 调价单 API（P0-E5-01 / P0-E5-02）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §5.6、§10.4；test-cases §6 TC-API-ADJ |
| **实现** | 迁移 `002_adjustment_batches`；`AdjustmentRepository`；`POST/GET adjustment-batches`、`approve`、`apply`；降幅 &gt;5% → `pending_approval` |
| **测试** | `npm test` — **34 passed** |
| **下一步** | Loop 8：Web 调价单列表 或 P1 渠道 OAuth 占位 |

### Loop 8 — 调价单 Web 页（P0-E6-07）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §10.4、§11；任务 P0-E6-07 |
| **实现** | `GET /api/v1/adjustment-batches` 列表；Web `App` 顶栏 + 子导航；`AdjustmentBatchesPage` 创建/列表/详情、审批与应用；`client` 调价 API；三语文案与样式 |
| **测试** | `npm test` — **35 passed**（含 TC-API-ADJ-000 列表） |
| **下一步** | P1 渠道 OAuth 占位、竞品采集管道 |

### Loop 9 — 渠道 OAuth 占位与 mock 读价（P1-E1 / P1-E2）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §4、§9、§15 `channel-adapters`；test-cases TC-INT-CH-001/002；任务 P1-E1-02–04、P1-E2-01 |
| **实现** | 迁移 `003_shops`；`ShopRepository`；`GET/POST shops`、OAuth start/mock-complete、加密 token；`packages/channel-adapters` mock `pullListing`；Web「渠道」页 |
| **测试** | `npm test` — **39 passed**（`tests/api/shops.test.ts`） |
| **下一步** | P2-E1 竞品 Offer CRUD、手工录入观测 |

### Loop 10 — 竞品 Offer 与手工观测（P2-E1）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §5.4、§8.2、§10.6；任务 P2-E1-01/03/04 |
| **实现** | 迁移 `004_competitors`；`CompetitorRepository`；竞品 CRUD API、观测录入、effective 归一化、median anchor；`pricing-context` 竞品摘要；Web「竞品」页 |
| **测试** | `npm test` — **43 passed**（`tests/api/competitors.test.ts`） |
| **下一步** | P2-E2 采集管道 Tier 调度、事件 CompetitorPriceChanged |

### Loop 11 — 采集占位与去抖事件（P2-E2 / P2-E3）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §8.1–8.5；test-cases TC-INT-EVT-001–004、TC-INT-ING-005；任务 P2-E2-01、P2-E3-01/04 |
| **实现** | 迁移 `005_repricing_events`；内存去抖 5min；`ingest/run` mock 采集；`repricing-events/flush` + `process` → `suggested` Version；观测变更接入 debounce |
| **测试** | `npm test` — **48 passed**（`tests/api/repricing-events.test.ts`） |
| **下一步** | P2-E3 动态规则 CRUD、Stale 冻结 |

### Loop 12 — 动态规则与 Stale 冻结（P2-E3-03 / P2-E2-05）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §5.6、§8.5、§10.5；TC-INT-ING-004、TC-API-GUARD-005 |
| **实现** | 迁移 `006_dynamic_rules`；`DynamicRuleRepository` + `ListingHealth`；`PUT/GET/unfreeze` 动态规则；`stale-check`；`process` 尊重 stale / frozen / min_gap |
| **测试** | `npm test` — **51 passed**（`tests/api/dynamic-rules.test.ts`） |
| **下一步** | P3 Guard 冷却与日上限、渠道回写 |

### Loop 13 — Guard 冷却/日上限与渠道写价 mock（P3-E1 / P3-E2）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §6.7、§9 写价；TC-INT-GUARD-001/002/004、TC-INT-CH-003 |
| **实现** | `repricing_activity` 审计；`checkDynamicRepricingGuards`；`POST channel-publish` + `MockChannelPublishAdapter`；失败熔断 `rule.frozen` |
| **测试** | `npm test` — **55 passed**（GUARD + CH-003） |
| **下一步** | P3 完整回写重试、指挥中心批量 Pending |

---

## 本地命令

```bash
npm ci && npm run build && npm test
npm run db:up       # PostgreSQL
export DATABASE_URL=postgresql://mx:mx@localhost:5432/mx_pricing
npm run db:migrate
npm run dev:bff     # 自动 migrate+seed（设 DATABASE_URL 时）
```

Demo：`GET /api/v1/skus/demo-sku-001/pricing-context` + `X-Tenant-Id: tenant-demo`

---

## 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-07-20 | Loop 1 |
| v1.1 | 2026-07-20 | Loop 2 |
| v1.2 | 2026-07-20 | Loop 3 |
| v1.3 | 2026-07-20 | Loop 4 |
| v1.4 | 2026-07-20 | Loop 5 |
| v1.5 | 2026-07-20 | Loop 6 |
| v1.6 | 2026-07-21 | Loop 7 |
| v1.7 | 2026-07-21 | Loop 8 |
| v1.8 | 2026-07-21 | Loop 9 |
| v1.9 | 2026-07-21 | Loop 10 |
| v2.0 | 2026-07-21 | Loop 11 |
| v2.1 | 2026-07-21 | Loop 12 |
| v2.2 | 2026-07-21 | Loop 13 |
