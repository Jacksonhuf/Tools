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
| P3 回写 | 部分完成 | Loop 27：P3 accepted + 验收 API |
| P4 Agent | 部分完成 | Loop 26：P4 accepted + Playwright |
| P5 增强 | 脚手架 | Loop 33–36：sidecar、ops metrics、收官文档 |

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
| P0-E8-02 | 部分 | Loop 29（`postgres-bff-smoke` + `ci-postgres-int`） |
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
| P3-E3-01 | 部分 | Loop 16（对账 RECON-001） |
| P3-E3-02 | 部分 | Loop 15（指挥中心 Pending 队列） |
| P4-E1-02 | 部分 | Loop 19（agent tools + audit） |
| P4-E1-03 | 部分 | Loop 21–23（Copilot 三语 + digest） |
| P4-E1-06 | 部分 | Loop 20–22（NL compile + HTTP LLM + 多轮会话） |
| P4-E1-07 | 部分 | Loop 23–26（digest + queue + SMTP） |
| P0-E8-04 | 部分 | Loop 26（Playwright ui-smoke + ci-e2e-smoke） |

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

### Loop 14 — 渠道写价 Web、Amazon 与步长重试（P3-E2-02/03）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §9 写价；TC-INT-CH-004/005 |
| **实现** | `normalizePriceForChannel` + `retry_on_step`；`POST shops/:shopId/channel-publish`；Mock 按渠道步长；定价页/渠道页「同步到渠道」；熔断仅 `CHANNEL_REJECTED` |
| **测试** | `npm test` — **59 passed**（CH-004/005 + 既有用例） |
| **下一步** | P3 批量 Pending 发布、TC-INT-CH-006 部分成功 |

### Loop 15 — 批量写价部分成功与指挥中心 Pending（P3-E2-04 / P3-E3-02）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §9.3、§10；TC-INT-CH-006、TC-E2E-OPS-002 |
| **实现** | `POST channel-publish/batch`（`partial_success`）；Version `channel_publish_status`（内存）；`repricing-queue` + `promote-pending`；Web「指挥中心」页 |
| **测试** | `npm test` — **61 passed**（CH-006、OPS-002） |
| **下一步** | P3 idempotency、对账 TC-INT-RECON-001 |

### Loop 16 — 发布幂等与渠道对账（P3-E2-06 / P3-E3-01）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §9、§13；TC-INT-RECON-001 |
| **实现** | `idempotency_key` 写价回放；`POST listings/:id/reconcile` + `GET reconciliation-alerts`；Mock `priceByRef`；指挥中心对账区 |
| **测试** | `npm test` — **64 passed**（idempotency + RECON-001） |
| **下一步** | P3-E1 auto_pending、TC-NFR-REL-003 |

### Loop 17 — auto_pending 与采集失败不降价（P3-E1-03 / P3-E3-05）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | PRD 动态动作；TC-NFR-REL-003；SDD §13 |
| **实现** | `auto_pending` 动作 → `pending` Version；采集 `CHANNEL_UNAVAILABLE` 熔断 + `ingest_failed`；`INGEST_FAILED_NO_DOWNGRADE` 守卫；迁移 `008` |
| **测试** | `npm test` — **67 passed**（NFR-REL-003 + auto_pending） |
| **下一步** | P3 营业时间窗、Version 审计 TC-INT-VER-003 |

### Loop 18 — 墨西哥营业时间窗与 Version 审计（P3-E1-02 / P3-E1-04）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §5.5；TC-INT-VER-003 |
| **实现** | `business_hours_only` + `OUTSIDE_BUSINESS_HOURS`；事件 Version 写入 `trigger_event_id`、snapshot ids；`GET price-versions/:id`；迁移 `009` |
| **测试** | `npm test` — **70 passed**（VER-003 + business hours） |
| **下一步** | P4 Agent 工具、TC-INT-AGENT-001 |

### Loop 19 — Agent 工具 API 与调用审计（P4-E1-02 / SEC-004 / AGENT-004）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §10.7；TC-INT-AGENT-001/002/004、TC-NFR-SEC-004 |
| **实现** | `GET agent/tools`、`POST agent/tools/invoke`、`GET agent/tool-audit`；只读 context/versions/simulate + 草稿调价单；禁止 publish/apply 工具名 |
| **测试** | `npm test` — **74 passed**（agent-tools.test.ts） |
| **下一步** | P4 NL→Rule 编译（TC-E2E-AGENT-003）、Copilot Web |

### Loop 20 — NL 规则编译与 Copilot Web（P4-E1-06 / TC-E2E-AGENT-003）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §12 策略编译器；TC-E2E-AGENT-003 |
| **实现** | `compile` / `confirm-compiled` 动态规则；确定性 NL mock；Web Copilot 页（context 工具 + 草案确认） |
| **测试** | `npm test` — **76 passed**（rule-compiler.test.ts） |
| **下一步** | P4 Copilot 三语文案增强、真实 LLM 适配器占位 |

### Loop 21 — 规则编译器适配器与 Copilot 增强（P4-E1-03 / LLM 占位）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §12 策略编译器；任务 P4-E1-03 |
| **实现** | `rule-compiler-adapter`（`RULE_COMPILER_DRIVER` heuristic / `llm_stub`）；`GET rule-compiler/status`；compile 响应 `compiler` 元数据；Copilot：三语 NL 示例、工具目录、调价草案工具、tool-audit 列表 |
| **测试** | `npm test` — **80 passed**（rule-compiler-adapter.test.ts） |
| **下一步** | 真实 LLM provider 接入、Copilot 会话与多轮澄清 |

### Loop 22 — LLM HTTP 编译器与 Copilot 多轮会话（P4-E1-06 / SDD §12）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §12 Agent 会话；Loop 21 下一步 |
| **实现** | `RULE_COMPILER_DRIVER=llm_http` + `RULE_COMPILER_LLM_ENDPOINT` HTTP 编译；失败回退 heuristic；`POST/GET copilot/sessions` 与 `messages` 多轮澄清；Web Copilot 聊天区；compile 审计带 `session_id` |
| **测试** | `npm test` — **86 passed**（copilot-session、llm-rule-compiler） |
| **下一步** | Copilot 自动拉 context 叙事、P4-E1-07 digest 占位、生产 LLM 契约文档 |

### Loop 23 — Context 叙事、每日 Digest 与 LLM 契约（P4-E1-07 / TC-INT-AGENT-004）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | SDD §12；任务 P4-E1-07；Loop 22 下一步 |
| **实现** | Copilot 建会话默认 `bootstrap_context`（`tool_get_pricing_context` + 三语叙事）；`GET agent/digest/daily`；`docs/llm-rule-compiler-contract.md`；Web 每日摘要卡片 |
| **测试** | `npm test` — **89 passed**（agent-digest、copilot-narrative） |
| **下一步** | Digest 邮件/调度占位、Copilot 诊断意图（simulate 叙事）、P3 里程碑收尾 |

### Loop 24 — Digest 调度占位与 Copilot 试算叙事（P4-E1-07 / P3 收尾）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 23 下一步；P3 回写里程碑 |
| **实现** | `PUT/GET digest/schedule`、`POST digest/daily/dispatch`（email_stub）、`GET digest/dispatches`；Copilot 识别 simulate 意图 → `tool_simulate` 三语叙事；P3 里程碑标记为进行中 |
| **测试** | `npm test` — **91 passed**（digest-dispatch、copilot simulate） |
| **下一步** | 真实邮件/队列集成、P4 里程碑验收、E2E Web 冒烟 |

### Loop 25 — Digest 队列、P4 验收与 E2E 冒烟（P4 / P0-E8-04）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 24 下一步；`test-cases` ci-e2e-smoke；`p4-acceptance-checklist` |
| **实现** | `digest-job-queue`（enqueue/process、`webhook_queue` + `DIGEST_WEBHOOK_URL`）；`GET /agent/readiness`；`tests/e2e/smoke-flow.test.ts` + `npm run test:smoke`；Copilot P4 状态与队列入队 UI |
| **测试** | `npm test` — **96 passed**（smoke-flow、p4-readiness、digest-queue） |
| **下一步** | Playwright 真 E2E、SMTP 适配器、P4 里程碑完成标记 |

### Loop 26 — Playwright E2E、SMTP Digest 与 P4 里程碑（P0-E8-04 / P4）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 25 下一步；P0-E8-04；`p4-acceptance-checklist` |
| **实现** | `@playwright/test` + `ui-smoke.spec.ts` + `ci-e2e-smoke`；`smtp_queue` + `SMTP_SUBMISSION_URL`；`GET /agent/milestones`（P4 `accepted`）；`data-testid=app-shell` |
| **测试** | `npm test` — **99 passed**；`npm run test:e2e` — **1 passed** |
| **下一步** | P3 完成验收、生产 SMTP/Playwright 扩展用例、PR 合并准备 |

### Loop 27 — P3 验收、E2E 扩展与合并就绪（P3 / PR prep）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 26 下一步；P3 任务清单 |
| **实现** | `p3-readiness` + `GET /product/readiness`；`p3-acceptance-checklist` + `merge-readiness`；Playwright Ops/i18n；`ci-vitest-full`；`p3-smoke.test.ts` |
| **测试** | `npm test` — **102 passed**；`npm run test:e2e` — **2 passed** |
| **下一步** | 合并 main、扩展 Playwright 调价流、渠道沙箱 |

### Loop 28 — 渠道沙箱与调价审批 Playwright（TC-E2E-ADJ-004 / P1 沙箱）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 27 下一步；`channel-sandbox`；TC-E2E-ADJ-004 |
| **实现** | `channel-sandbox-ledger` + `GET channels/sandbox/*`；publish/pull 事件；Channels 沙箱提示；Playwright `adjustment-approval.spec.ts`；`docs/channel-sandbox.md` |
| **测试** | `npm test` — **104 passed**；`npm run test:e2e` — **3 passed** |
| **下一步** | 合并 PR #1、扩展渠道沙箱 UI 事件列表、PostgreSQL 全链路 CI |

### Loop 29 — 沙箱事件 UI 与 PostgreSQL CI（TC-E2E-CH-001 / TC-INT-PG-001）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 28 下一步；`merge-readiness`；P0-E8-02 |
| **实现** | Channels 页沙箱事件表 + `fetchChannelSandboxEvents`；`postgres-bff-smoke.test.ts`；`ci-postgres-int`；Playwright `channels-sandbox.spec.ts`；更新 `merge-readiness` |
| **测试** | `npm test` — **104 passed**；`ci-postgres-int` 另跑 **2** PG 用例；`npm run test:e2e` — **4 passed** |
| **下一步** | 合并 PR #1、PG CI 扩展 shop/adjustment 仓储、生产 `CHANNEL_SANDBOX_MODE=false` 运维说明 |

### Loop 30 — PG shop/adjustment 与生产沙箱清单（TC-INT-PG-002/003 / TC-API-SBX-002）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 29 下一步；`channel-sandbox`；P3 调价 + P1 店铺 |
| **实现** | `postgres-bff-smoke` 扩展 OAuth 落库 + 调价单审批；`channel-sandbox.test` 生产模式回归；`docs/channel-sandbox-production.md` |
| **测试** | `npm test` — **105 passed**（PG 4 skipped）；`ci-postgres-int` — **4** PG 用例；`npm run test:e2e` — **4 passed** |
| **下一步** | 合并 PR #1、真实渠道 HTTP 适配器接线、PG repricing/competitor 仓储 CI |

### Loop 31 — HTTP 渠道桩适配器与 PG 竞品/调价事件（TC-API-CH-HTTP-001 / TC-INT-PG-004/005）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 30 下一步；P1 渠道；P2 竞品/repricing |
| **实现** | `HttpStubChannel*Adapter` + `channel-adapter-factory`；`GET channels/adapters/status`；`postgres-bff-smoke` 竞品观测 + repricing flush；`docs/channel-http-adapters.md` |
| **测试** | `npm test` — **109 passed**（PG 6 skipped）；`ci-postgres-int` — **6** PG 用例 |
| **下一步** | 合并 PR #1、渠道网关联调、Web 展示 adapter 状态 |

### Loop 32 — Channels 适配器状态 UI（TC-E2E-CH-002 / 网关联调文档）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 31 下一步；`channel-http-adapters` |
| **实现** | `fetchChannelAdapterStatus` + Channels 适配器卡片；发布/拉取后刷新沙箱事件；`channel-http-adapters` 网关示例；Playwright CH-002 |
| **测试** | `npm test` — **109 passed**；`npm run test:e2e` — **4 passed** |
| **下一步** | 合并 PR #1、sidecar 样例服务、P5 监控与告警占位 |

### Loop 33 — Channel gateway sidecar（TC-INT-CH-GW 脚手架）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **阅读** | Loop 32 下一步；`channel-http-adapters` |
| **实现** | `tools/channel-gateway-sidecar/server.mjs`；`npm run dev:channel-gateway` |
| **测试** | 见 Loop 35 契约测 |
| **下一步** | P5 ops metrics |

### Loop 34 — Ops metrics API 与指挥中心 UI（TC-API-OPS-001）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **实现** | `ops-metrics.ts` + `GET /ops/metrics`；Ops 页 `ops-metrics` 卡片 |
| **测试** | `ops-metrics.test.ts` |
| **下一步** | 网关契约集成测、P5 清单 |

### Loop 35 — 网关契约测与 P5 清单

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **实现** | `channel-gateway-contract.test.ts`；`p5-acceptance-checklist.md` |
| **测试** | `npm test` — **111 passed**（PG 6 skipped） |
| **下一步** | Loop 收官与合并 PR |

### Loop 36 — Development Loop 收官

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **实现** | `development-loop-closure.md`；`merge-readiness` 更新；Playwright ops metrics |
| **测试** | `npm run test:e2e` — **4 passed** |
| **下一步** | **合并 PR #1**；后续 Epic 新开 Loop 37+ |

> **Loop 1–36** 已随 PR #1 合并；**Loop 37+** 从 `main` 开分支 `cursor/<描述>-1936`。

### Loop 37 — Cross-channel Guard（P5-01 / TC-API-XCH-001）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **分支** | `cursor/cross-channel-guard-1936`（已合并 main） |
| **实现** | `evaluateCrossChannelSpread`；`GET /skus/:id/cross-channel-guard`；定价页横幅 |
| **测试** | `cross-channel-guard.test.ts` + unit TC-UNIT-XCH-* |
| **下一步** | P5-03 报表导出 |

### Loop 38 — 定价报表导出（P5-03 / TC-API-RPT-001/002）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-21 |
| **分支** | `cursor/report-export-1936` |
| **实现** | `pricing-report-service`；`GET /reports/pricing-snapshot`；Ops 导出 CSV；`pricing-reports-export.md` |
| **测试** | `pricing-report.test.ts` |
| **下一步** | Loop 39+ OIDC、特性开关 |

### Loop 39 — OIDC stub 认证（P0-E1-03 / TC-API-AUTH-*）

| 项 | 内容 |
|----|------|
| **实现** | `auth.ts` + `GET /auth/status`；`AUTH_DRIVER=oidc_stub` |
| **测试** | `auth-oidc.test.ts` |

### Loop 40 — 特性开关（X-02 / TC-API-FF-001）

| 项 | 内容 |
|----|------|
| **实现** | `feature-flags.ts` + `GET /feature-flags` |
| **测试** | `feature-flags.test.ts` |

### Loop 41 — 对账告警 CSV（P5-03 扩展 / TC-API-RPT-003）

| 项 | 内容 |
|----|------|
| **实现** | `GET /reports/reconciliation-alerts?format=csv` |
| **测试** | `reconciliation-report.test.ts` |

### Loop 42 — NFR 周检与 Phase 2 收官

| 项 | 内容 |
|----|------|
| **实现** | `ci-nfr-weekly.yml`；`development-loop-phase2-closure.md` |
| **测试** | `npm test` — **121 passed** |
| **下一步** | **Phase 2 完成**；Loop 43+ 见任务清单（真实 OIDC、渠道 API） |

> **Phase 2（Loop 37–42）计划内迭代已结束。**

### Loop 44 — 批量重算分片（P5-05 / TC-API-REPR-BATCH-001）

| 项 | 内容 |
|----|------|
| **实现** | `repricing-batch-shard.ts`；`GET .../repricing-batch/shard-plan`；`POST .../repricing-batch/recompute`；`listListingsForSku` |
| **文档** | `docs/repricing-batch-shard.md` |
| **测试** | `repricing-batch-shard.test.ts` |
| **下一步** | 外部队列 worker、JWKS（Loop 43 PR）、跨 SKU 编排 |

### Loop 45 — 分片编排与外部 worker（P5-05 扩展 / TC-API-REPR-BATCH-003）

| 项 | 内容 |
|----|------|
| **实现** | `runRepricingBatchAllShards` / `runRepricingBatchForTenant`；`POST .../recompute-all`（SKU + tenant）；`tools/repricing-batch-worker/run.mjs` |
| **文档** | `docs/repricing-batch-shard.md`（worker 环境变量） |
| **测试** | `repricing-batch-shard.test.ts` TC-API-REPR-BATCH-003 |
| **下一步** | JWKS RS256（Loop 43 PR）、持久化 job 队列 |

### Loop 43 — HS256 JWT（`oidc_jwt` / TC-API-AUTH-003）

| 项 | 内容 |
|----|------|
| **实现** | `oidc-jwt.ts`、`auth-jwt-integration.ts`、`AUTH_DRIVER=oidc_jwt` |
| **文档** | `docs/auth-jwt-hs256.md` |
| **测试** | `auth-jwt.test.ts` TC-API-AUTH-003 |

### Loop 46 — JWKS RS256（TC-API-AUTH-004）

| 项 | 内容 |
|----|------|
| **实现** | `oidc-jwks.ts`；`OIDC_JWKS_JSON` / `OIDC_JWKS_URL`；`validateBearerTokenAsync` |
| **文档** | `docs/auth-jwks-rs256.md` |
| **测试** | `auth-jwt.test.ts` TC-API-AUTH-004 |
| **下一步** | 合并 supersede PR #5；`iss`/`aud` 校验；持久化 repricing job 队列 |

### Loop 47 — JWT `iss` / `aud`（TC-API-AUTH-005）

| 项 | 内容 |
|----|------|
| **实现** | `jwt-claims.ts`；`OIDC_JWT_ISSUER` / `OIDC_JWT_AUDIENCE`；`auth/status` 标志位 |
| **文档** | `docs/auth-jwt-claims.md` |
| **测试** | `jwt-claims.test.ts`、`auth-jwt.test.ts` TC-API-AUTH-005 |
| **下一步** | 持久化 repricing job 队列；JWKS 缓存 TTL |

### Loop 48 — Repricing batch job 队列（TC-API-REPR-BATCH-004）

| 项 | 内容 |
|----|------|
| **实现** | `repricing-batch-job-queue.ts`；enqueue/list/get/process API；`ops/metrics.repricing_batch_queue`；worker `queue` 模式 |
| **文档** | `docs/repricing-batch-queue.md` |
| **测试** | `repricing-batch-job-queue.test.ts` |
| **下一步** | PG 持久化队列；JWKS TTL |

### Loop 49 — Repricing batch 队列 PostgreSQL（TC-INT-REPR-BATCH-PG）

| 项 | 内容 |
|----|------|
| **实现** | 迁移 `010_repricing_batch_jobs.sql`；`PostgresRepricingBatchJobStore`；`REPRICING_BATCH_QUEUE_DRIVER=postgres` |
| **文档** | `docs/repricing-batch-queue.md` |
| **测试** | `postgres-repricing-batch-job-store.test.ts`；队列 API 仍用 memory |
| **下一步** | JWKS 缓存 TTL；跨进程 job 租约 |

### Loop 50–56 — Backlog 收官（见 `development-backlog-closure.md`）

| Loop | 主题 |
|------|------|
| 50 | JWKS `OIDC_JWKS_CACHE_TTL_SEC` |
| 51 | PG job lease + `X-Repricing-Worker-Id` |
| 52 | P5-02 品类规则模板 |
| 53 | X-01 `ops/metrics.nfr` |
| 54 | P5-04 shared fee templates |
| 55 | NFR timing test + ci-nfr-weekly |
| 56 | `CHANNEL_LIVE_ACKNOWLEDGED` |

| **测试** | **145+** Vitest（含 `jwks-cache`、`category-rule-template`、`pricing-timing`） |

### Loop 57 — `main` 收官（P5 readiness + Ops UI + 费率套用）

| 项 | 内容 |
|----|------|
| **日期** | 2026-07-22 |
| **实现** | `p5-readiness` + `product/readiness` / `agent/milestones` P5；`POST apply-shared-fee-template`；Web Ops 展示 repricing 队列与 NFR；OpenAPI 补全 P5 路径 |
| **测试** | `p5-readiness.test.ts`；TC-API-TPL-002 |
| **下一步** | Loop 58+ Epic（特性开关、Buy Box、DLQ） |

### Loop 58 — 特性开关扩展（X-02）

| 项 | 内容 |
|----|------|
| **实现** | `FEATURE_BUY_BOX_ANCHOR`、`FEATURE_REPRICING_BATCH_WORKER`、`FEATURE_CHANNEL_LIVE_PUBLISH`；Web「里程碑」页展示 flags |
| **测试** | `feature-flags.test.ts` |

### Loop 59 — 产品里程碑 Web（X-04）

| 项 | 内容 |
|----|------|
| **实现** | `ProductReadinessPage` + `nav-readiness`；`fetchProductReadiness` |
| **测试** | Playwright 可扩展 `nav-readiness` |

### Loop 60 — Buy Box 锚点（P3-E3-03）

| 项 | 内容 |
|----|------|
| **实现** | 观测 `buy_box_winner`；`anchor.buy_box_mxn`；`anchor_type=buy_box` 引擎与重算 |
| **测试** | `buy-box-anchor.test.ts`、`competitive-buy-box.test.ts` |

### Loop 61 — Digest 死信队列（TC-NFR-REL-004）

| 项 | 内容 |
|----|------|
| **实现** | `simulate_poison`、重试、`dead_letter` 状态、`GET digest/jobs/dead-letter`、ops `digest_queue.dead_letter` |
| **测试** | `digest-dlq.test.ts` |

### Loop 62 — 跨渠道价差看板（P3-E3-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /cross-channel/dashboard`；Web「跨渠道价差」页 |
| **测试** | `loop-62-65.test.ts` TC-API-XCH-002 |

### Loop 63 — 落地成本 CSV 导入（P0-E5-03）

| 项 | 内容 |
|----|------|
| **实现** | `POST /imports/landed-cost`；指挥中心 CSV 粘贴导入 |
| **测试** | `landed-cost-import.test.ts`、TC-API-IMP-001 |

### Loop 64 — Version 备份导出（X-05）

| 项 | 内容 |
|----|------|
| **实现** | `GET /ops/version-backup`（JSON / download）；Ops 下载按钮 |
| **测试** | TC-API-OPS-002 |

### Loop 65 — 异步 Worker 骨架（P0-E1-05）

| 项 | 内容 |
|----|------|
| **实现** | `tools/async-worker/run.mjs`；`npm run dev:async-worker`；heartbeat + `GET /ops/workers/status` |
| **测试** | TC-API-WKR-001 |

### Loop 66 — 汇率表与 FX Landed Cost（P0-E2-03 / TC-UNIT-COST-001）

| 项 | 内容 |
|----|------|
| **实现** | `GET/PUT /fx-rates`；`POST /skus/:id/landed-cost/from-fx`（`computeLandedCost`） |
| **测试** | `loop-66-69.test.ts`、`landed-cost-fx.test.ts` |

### Loop 67 — 调价审批策略增强（P0-E5-02）

| 项 | 内容 |
|----|------|
| **实现** | `MARGIN_BELOW_TARGET` 触发 `pending_approval`；`GET /adjustment-batches/approval-policy`；创建批次返回 `approval_triggers` |
| **测试** | `loop-66-69.test.ts` |

### Loop 68 — 对象存储导出占位（P0-E1-06）

| 项 | 内容 |
|----|------|
| **实现** | `POST /exports` + 签名 token；`GET /exports/:id?token=` 下载 |
| **测试** | `loop-66-69.test.ts` |

### Loop 69 — Version 备份演练校验（X-05）

| 项 | 内容 |
|----|------|
| **实现** | `POST /ops/version-backup/validate`；`version-backup-validate.ts` |
| **测试** | `loop-66-69.test.ts` |

### Loop 70 — HS 关税表与 duty Landed Cost（P0-E2-04 / TC-UNIT-COST-002）

| 项 | 内容 |
|----|------|
| **实现** | `GET/PUT /tariff-hs-rates`；`POST /skus/:id/landed-cost/from-hs`（GL-COST-002） |
| **测试** | `loop-70-73.test.ts` |

### Loop 71 — 调价批次预览（P0-E5-04）

| 项 | 内容 |
|----|------|
| **实现** | `POST /adjustment-batches/preview`（不落库） |
| **测试** | `loop-70-73.test.ts` |

### Loop 72 — 调价 CSV 导入与模板（P0-E5-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /imports/adjustment-prices/template`；`POST /imports/adjustment-prices` |
| **测试** | `loop-70-73.test.ts`、`adjustment-price-import.test.ts` |

### Loop 73 — Ops 成本/调价工具（Web）

| 项 | 内容 |
|----|------|
| **实现** | 指挥中心 HS 试算、关税表只读、调价 CSV 预览；`POST /exports` `pricing_snapshot_csv` |
| **测试** | `loop-70-73.test.ts` |

### Loop 74 — Cost Sheet 批次（P0-E2-02）

| 项 | 内容 |
|----|------|
| **实现** | `GET/POST /skus/:id/cost-sheets`；`freight_alloc_rule` 枚举 |
| **测试** | `loop-74-77.test.ts` |

### Loop 75 — 从 Cost Sheet 计算 Landed（P0-E2-05）

| 项 | 内容 |
|----|------|
| **实现** | `POST /skus/:id/landed-cost/from-cost-sheet`（MXN+HS / USD+FX） |
| **测试** | `loop-74-77.test.ts`、`landed-cost-from-sheet.test.ts` |

### Loop 76 — 调价 CSV 落库（P0-E5-03）

| 项 | 内容 |
|----|------|
| **实现** | `POST /imports/adjustment-prices` 支持 `apply: true` 创建批次 |
| **测试** | `loop-74-77.test.ts` |

### Loop 77 — 成本批次与调价 CSV Web（P0-E6-07）

| 项 | 内容 |
|----|------|
| **实现** | 定价页 Cost Sheet 面板；调价页 CSV 创建批次 |
| **测试** | `loop-74-77.test.ts`（API）；Web `data-testid` 可扩展 E2E |

### Loop 78 — 瀑布 CSV 导出（P0-E5-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /skus/:id/waterfall/export`；`waterfall-export.ts` |
| **测试** | `loop-78-81.test.ts`、`waterfall-export.test.ts` |

### Loop 79 — Cost Sheet CSV 批量导入

| 项 | 内容 |
|----|------|
| **实现** | `GET/POST /imports/cost-sheets` |
| **测试** | `loop-78-81.test.ts` |

### Loop 80 — SKU Policy 配置 API（P0-E6-08）

| 项 | 内容 |
|----|------|
| **实现** | `PATCH /skus/:id/policy`；catalog `updateSkuPolicy` |
| **测试** | `loop-78-81.test.ts` |

### Loop 81 — Policy/费用 Web + Listing 同步任务（P0-E6-08 / P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `PolicyConfigPage`；`POST/GET listings/:id/sync`；通道页同步按钮 |
| **测试** | `loop-78-81.test.ts` |

### Loop 82 — 瀑布导出对象存储（P0-E5-03）

| 项 | 内容 |
|----|------|
| **实现** | `POST /exports` kind `waterfall_csv` |
| **测试** | `loop-82-85.test.ts` |

### Loop 83 — Listing 定时同步配置（P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET/PUT /ops/listing-sync/schedule` |
| **测试** | `loop-82-85.test.ts` |

### Loop 84 — 竞品价格曲线 API（P2-E1-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /listings/:id/competitors/curve`；`competitor-curve.ts` |
| **测试** | `loop-82-85.test.ts`、`competitor-curve.test.ts` |

### Loop 85 — Ops/定价/竞品 Web（P2-E3-06 部分）

| 项 | 内容 |
|----|------|
| **实现** | Ops Cost Sheet CSV；定价页瀑布导出；竞品曲线天数展示 |
| **测试** | `loop-82-85.test.ts` |

### Loop 86 — Listing 到期同步执行（P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `POST /ops/listing-sync/run-due`；`listing-sync-run-due.ts`；`last_run_at` |
| **测试** | `loop-86-89.test.ts` |

### Loop 87 — 竞品曲线 CSV 导出（P2-E1-03）

| 项 | 内容 |
|----|------|
| **实现** | `POST /exports` kind `competitor_curve_csv` |
| **测试** | `loop-86-89.test.ts`、`loop-86-89-csv.test.ts` |

### Loop 88 — 调价单 CSV 导出（P0-E5-04）

| 项 | 内容 |
|----|------|
| **实现** | `POST /exports` kind `adjustment_batch_csv` |
| **测试** | `loop-86-89.test.ts` |

### Loop 89 — Ops/竞品/调价 Web（P2-E3-06 续）

| 项 | 内容 |
|----|------|
| **实现** | Ops 同步计划与 run-due；竞品曲线 CSV；调价单 CSV 下载 |
| **测试** | `loop-86-89.test.ts` |

### Loop 90 — Listing 同步作业总览（P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /ops/listing-sync/jobs` |
| **测试** | `loop-90-93.test.ts` |

### Loop 91 — 竞品曲线直链 CSV（P2-E1-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /listings/:id/competitors/curve/export` |
| **测试** | `loop-90-93.test.ts` |

### Loop 92 — 调价直链导出与 Cron 校验（P0-E5-04 / P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /adjustment-batches/:id/export`；cron 校验；`run-due?force=true` |
| **测试** | `loop-90-93.test.ts` |

### Loop 93 — Ops 同步作业 Web（P2-E3-06 续）

| 项 | 内容 |
|----|------|
| **实现** | 上次执行时间、强制同步、作业表 |
| **测试** | `loop-90-93.test.ts` |

### Loop 94 — Listing 同步运维状态（P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /ops/listing-sync/status`；`listing-sync-ops-status.ts` |
| **测试** | `loop-94-97.test.ts` |

### Loop 95 — 同步作业 CSV（P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /ops/listing-sync/jobs/export`；`POST /exports` → `listing_sync_jobs_csv` |
| **测试** | `loop-94-97.test.ts` |

### Loop 96 — 对账告警导出对象存储（P3-E3-01）

| 项 | 内容 |
|----|------|
| **实现** | `POST /exports` → `reconciliation_alerts_csv` |
| **测试** | `loop-94-97.test.ts` |

### Loop 97 — 通道/竞品/Ops Web（P1-E2 / P2-E3）

| 项 | 内容 |
|----|------|
| **实现** | 通道页最近同步；竞品直链曲线；Ops 汇总与导出按钮 |
| **测试** | `loop-94-97.test.ts` |

### Loop 98 — 跨渠道看板 CSV（P3-E3-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /cross-channel/dashboard/export`；`POST /exports` → `cross_channel_dashboard_csv` |
| **测试** | `loop-98-101.test.ts` |

### Loop 99 — Cost Sheet CSV 导出（P0-E5-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /skus/:id/cost-sheets/export`；`POST /exports` → `cost_sheets_csv` |
| **测试** | `loop-98-101.test.ts` |

### Loop 100 — 重算批处理作业汇总/CSV（P5-05）

| 项 | 内容 |
|----|------|
| **实现** | `GET /repricing-batch/jobs/summary` 与 `/export`；`repricing_batch_jobs_csv` |
| **测试** | `loop-98-101.test.ts` |

### Loop 101 — 看板/定价/Ops Web（P3/P5）

| 项 | 内容 |
|----|------|
| **实现** | 跨渠道导出；定价页 Cost Sheet 导出；Ops 批处理摘要与导出 |
| **测试** | `loop-98-101.test.ts` |

### Loop 102 — Agent Digest CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `GET /agent/digest/daily/export`；`POST /exports` → `agent_digest_csv` |
| **测试** | `loop-102-105.test.ts` |

### Loop 103 — HS 关税表 CSV（P0-E2-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /tariff-hs-rates/export`；`tariff_hs_csv` |
| **测试** | `loop-102-105.test.ts` |

### Loop 104 — SKU 策略批量 PATCH（P0-E6-08）

| 项 | 内容 |
|----|------|
| **实现** | `POST /skus/policy/batch`；`sku-policy-batch.ts` |
| **测试** | `loop-102-105.test.ts` |

### Loop 105 — Copilot/Ops/策略 Web（P4/P0-E6）

| 项 | 内容 |
|----|------|
| **实现** | Digest CSV；关税导出；策略批量保存按钮 |
| **测试** | `loop-102-105.test.ts` |

### Loop 106 — FX 汇率 CSV（P0-E2-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /fx-rates/export`；`fx_rates_csv` |
| **测试** | `loop-106-109.test.ts` |

### Loop 107 — Agent 工具审计 CSV（P4-E1-02）

| 项 | 内容 |
|----|------|
| **实现** | `GET /agent/tool-audit/export`；`agent_tool_audit_csv` |
| **测试** | `loop-106-109.test.ts` |

### Loop 108 — Digest 到期派发（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `POST /agent/digest/run-due`；cron 校验；`last_dispatch_at` |
| **测试** | `loop-106-109.test.ts` |

### Loop 109 — Copilot/Ops Web（P4）

| 项 | 内容 |
|----|------|
| **实现** | Digest 计划与 run-due；审计/FX CSV 导出 |
| **测试** | `loop-106-109.test.ts` |

### Loop 110 — 租户定价快照 CSV（P0-E4-05）

| 项 | 内容 |
|----|------|
| **实现** | `buildTenantPricingSnapshotRows`；`GET /reports/pricing-snapshots/export`；`pricing_snapshots_tenant_csv` |
| **测试** | `loop-110-113.test.ts`、`loop-110-113-csv.test.ts` |

### Loop 111 — 渠道沙箱事件 CSV（P1-E3）

| 项 | 内容 |
|----|------|
| **实现** | `channel-sandbox-csv.ts`；`GET /channels/sandbox/events/export`；`channel_sandbox_events_csv` |
| **测试** | `loop-110-113.test.ts` |

### Loop 112 — Digest DLQ 摘要与 CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `digest-dead-letter-csv.ts`；`GET .../dead-letter/summary` 与 `/export`；`digest_dead_letter_csv` |
| **测试** | `loop-110-113.test.ts` |

### Loop 113 — Ops/Channels/Copilot Web（P0/P1/P4）

| 项 | 内容 |
|----|------|
| **实现** | 租户定价快照导出；沙箱事件 CSV；Copilot DLQ 摘要与导出 |
| **测试** | `loop-110-113.test.ts` |

### Loop 114 — 租户重算队列 CSV（P3-E3-02）

| 项 | 内容 |
|----|------|
| **实现** | `buildTenantRepricingQueue`；`GET /repricing-queue/export`；`repricing_queue_csv` |
| **测试** | `loop-114-117.test.ts` |

### Loop 115 — Digest 派发历史 CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `digest-dispatches-csv.ts`；`GET /agent/digest/dispatches/export`；`digest_dispatches_csv` |
| **测试** | `loop-114-117.test.ts` |

### Loop 116 — Digest 排队作业摘要与 CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `digest-queued-jobs-csv.ts`；`GET .../jobs/summary` 与 `/jobs/export`；`digest_queued_jobs_csv` |
| **测试** | `loop-114-117.test.ts` |

### Loop 117 — Worker 心跳 CSV + Web（P5）

| 项 | 内容 |
|----|------|
| **实现** | `worker-heartbeats-csv.ts`；`GET /ops/workers/status/export`；Ops/Copilot 导出按钮 |
| **测试** | `loop-114-117.test.ts`、`loop-114-117-csv.test.ts` |

### Loop 118 — 竞品价格历史 CSV（P2-E1-03）

| 项 | 内容 |
|----|------|
| **实现** | `price-history-csv.ts`；`GET /listings/:id/price-history/export`；`price_history_csv` |
| **测试** | `loop-118-121.test.ts` |

### Loop 119 — 重算事件 CSV（P2-E3-01）

| 项 | 内容 |
|----|------|
| **实现** | `repricing-events-csv.ts`；`GET /listings/:id/repricing-events/export`；`repricing_events_csv` |
| **测试** | `loop-118-121.test.ts` |

### Loop 120 — 调价单索引 CSV（P0-E5-04）

| 项 | 内容 |
|----|------|
| **实现** | `adjustment-batches-index-csv.ts`；`GET /adjustment-batches/export`；`adjustment_batches_index_csv` |
| **测试** | `loop-118-121.test.ts` |

### Loop 121 — 竞品/调价 Web（P2/P0-E5）

| 项 | 内容 |
|----|------|
| **实现** | 价格历史与重算事件导出；调价单索引导出 |
| **测试** | `loop-118-121.test.ts` |

### Loop 122 — SKU 目录 CSV（P0-E2-01）

| 项 | 内容 |
|----|------|
| **实现** | `skus-catalog-csv.ts`；`GET /skus/export`；`skus_catalog_csv` |
| **测试** | `loop-122-125.test.ts` |

### Loop 123 — 店铺连接 CSV（P1-E1）

| 项 | 内容 |
|----|------|
| **实现** | `shops-csv.ts`；`GET /shops/export`；`shops_csv` |
| **测试** | `loop-122-125.test.ts` |

### Loop 124 — 类目规则模板 CSV（P5-02）

| 项 | 内容 |
|----|------|
| **实现** | `category-rule-templates-csv.ts`；`GET /category-rule-templates/export`；`category_rule_templates_csv` |
| **测试** | `loop-122-125.test.ts` |

### Loop 125 — 定价/通道/策略 Web（P0/P1/P5）

| 项 | 内容 |
|----|------|
| **实现** | SKU 目录、店铺、类目模板 CSV 导出按钮 |
| **测试** | `loop-122-125.test.ts` |

### Loop 126 — 竞品 Offer CSV（P2-E1-01）

| 项 | 内容 |
|----|------|
| **实现** | `competitor-offers-csv.ts`；`GET /listings/:id/competitors/export`；`competitor_offers_csv` |
| **测试** | `loop-126-129.test.ts` |

### Loop 127 — 共享费用模板 CSV（P5-04）

| 项 | 内容 |
|----|------|
| **实现** | `shared-fee-templates-csv.ts`；`GET /shared-fee-templates/export`；`shared_fee_templates_csv` |
| **测试** | `loop-126-129.test.ts` |

### Loop 128 — Ops 指标快照 CSV（P5）

| 项 | 内容 |
|----|------|
| **实现** | `ops-metrics-csv.ts`；`GET /ops/metrics/export`；`ops_metrics_csv` |
| **测试** | `loop-126-129.test.ts` |

### Loop 129 — 竞品/策略/Ops Web（P2/P5）

| 项 | 内容 |
|----|------|
| **实现** | 竞品 Offer、共享费用模板、运维指标 CSV 导出 |
| **测试** | `loop-126-129.test.ts` |

### Loop 130 — 对账告警直链 CSV（P3-E3-01）

| 项 | 内容 |
|----|------|
| **实现** | `GET /reconciliation-alerts/export`（复用 `reconciliationAlertsToCsv`） |
| **测试** | `loop-130-133.test.ts` |

### Loop 131 — Listing 同步运维状态 CSV（P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `listing-sync-ops-status-csv.ts`；`GET /ops/listing-sync/status/export`；`listing_sync_ops_status_csv` |
| **测试** | `loop-130-133.test.ts` |

### Loop 132 — 单 Listing 同步作业 CSV（P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /listings/:id/sync/jobs/export`；`listing_sync_jobs_listing_csv` |
| **测试** | `loop-130-133.test.ts` |

### Loop 133 — Ops/通道/Copilot Web（P3/P1/P4）

| 项 | 内容 |
|----|------|
| **实现** | 对账直链、同步状态、Listing 同步作业、Agent 工具目录导出 |
| **测试** | `loop-130-133.test.ts` |

### Loop 134 — 重算批处理汇总 CSV（P5）

| 项 | 内容 |
|----|------|
| **实现** | `repricing-batch-jobs-summary-csv.ts`；`GET /repricing-batch/jobs/summary/export`；`repricing_batch_jobs_summary_csv` |
| **测试** | `loop-134-137.test.ts` |

### Loop 135 — Listing 采集状态 CSV（P2-E2）

| 项 | 内容 |
|----|------|
| **实现** | `listing-ingest-status.ts` + `listing-ingest-status-csv.ts`；`GET /listings/:id/ingest/status/export`；`listing_ingest_status_csv` |
| **测试** | `loop-134-137.test.ts` |

### Loop 136 — 特性开关 CSV（P5 / X-02）

| 项 | 内容 |
|----|------|
| **实现** | `feature-flags-csv.ts`；`GET /feature-flags/export`；`feature_flags_csv` |
| **测试** | `loop-134-137.test.ts` |

### Loop 137 — Ops/竞品/就绪 Web（P5/P2）

| 项 | 内容 |
|----|------|
| **实现** | 重算批处理汇总、采集状态、特性开关 CSV 导出按钮 |
| **测试** | `loop-134-137.test.ts` |

### Loop 138 — P4 Agent 就绪 CSV（P4-E1）

| 项 | 内容 |
|----|------|
| **实现** | `agent-readiness-csv.ts`；`GET /agent/readiness/export`；`agent_readiness_csv` |
| **测试** | `loop-138-141.test.ts` |

### Loop 139 — 竞品锚点 CSV（P2-E1-04）

| 项 | 内容 |
|----|------|
| **实现** | `competitor-anchor-csv.ts`；`GET /listings/:id/competitors/anchor/export`；`competitor_anchor_csv` |
| **测试** | `loop-138-141.test.ts` |

### Loop 140 — 产品里程碑就绪 CSV（P3/P4/P5）

| 项 | 内容 |
|----|------|
| **实现** | `product-readiness-csv.ts`；`GET /product/readiness/export`；`product_readiness_csv` |
| **测试** | `loop-138-141.test.ts` |

### Loop 141 — Copilot/竞品/就绪 Web（P4/P2/P5）

| 项 | 内容 |
|----|------|
| **实现** | Agent 就绪、竞品锚点、产品里程碑 CSV 导出按钮 |
| **测试** | `loop-138-141.test.ts` |

### Loop 142 — Digest 队列汇总 CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `digest-queued-jobs-summary-csv.ts`；`GET /agent/digest/jobs/summary/export`；`digest_queued_jobs_summary_csv` |
| **测试** | `loop-142-145.test.ts` |

### Loop 143 — 渠道适配器状态 CSV（P1-E2 / P3-E2）

| 项 | 内容 |
|----|------|
| **实现** | `channel-adapters-status-csv.ts`；`GET /channels/adapters/status/export`；`channel_adapters_status_csv` |
| **测试** | `loop-142-145.test.ts` |

### Loop 144 — 规则编译器状态 CSV（P4-E1-06）

| 项 | 内容 |
|----|------|
| **实现** | `rule-compiler-status-csv.ts`；`GET /rule-compiler/status/export`；`rule_compiler_status_csv` |
| **测试** | `loop-142-145.test.ts` |

### Loop 145 — Copilot/通道 Web（P4/P1）

| 项 | 内容 |
|----|------|
| **实现** | Digest 队列汇总、规则编译器、渠道适配器状态 CSV 导出按钮 |
| **测试** | `loop-142-145.test.ts` |

### Loop 146 — 认证状态 CSV（P0-E1-03）

| 项 | 内容 |
|----|------|
| **实现** | `auth-status-csv.ts`；`GET /auth/status/export`；`auth_status_csv` |
| **测试** | `loop-146-149.test.ts` |

### Loop 147 — 渠道沙箱状态 CSV（P3-E2）

| 项 | 内容 |
|----|------|
| **实现** | `channel-sandbox-status-csv.ts`；`GET /channels/sandbox/status/export`；`channel_sandbox_status_csv` |
| **测试** | `loop-146-149.test.ts` |

### Loop 148 — Digest 死信汇总 CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `digest-dead-letter-summary-csv.ts`；`GET /agent/digest/jobs/dead-letter/summary/export`；`digest_dead_letter_summary_csv` |
| **测试** | `loop-146-149.test.ts` |

### Loop 149 — 指挥中心/通道/Copilot Web（P0/P3/P4）

| 项 | 内容 |
|----|------|
| **实现** | 认证状态、沙箱状态、死信汇总 CSV 导出按钮 |
| **测试** | `loop-146-149.test.ts` |

### Loop 150 — Listing 同步计划 CSV（P1-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `listing-sync-schedule-csv.ts`；`GET /ops/listing-sync/schedule/export`；`listing_sync_schedule_csv` |
| **测试** | `loop-150-153.test.ts` |

### Loop 151 — 产品里程碑目录 CSV（P3/P4/P5）

| 项 | 内容 |
|----|------|
| **实现** | `agent-milestones-csv.ts`；`GET /agent/milestones/export`；`agent_milestones_csv` |
| **测试** | `loop-150-153.test.ts` |

### Loop 152 — 调价审批策略 CSV（P0-E5-02）

| 项 | 内容 |
|----|------|
| **实现** | `adjustment-approval-policy-csv.ts`；`GET /adjustment-batches/approval-policy/export`；`adjustment_approval_policy_csv` |
| **测试** | `loop-150-153.test.ts` |

### Loop 153 — Worker 状态汇总 CSV + Web（P5/P1/P0）

| 项 | 内容 |
|----|------|
| **实现** | `ops-workers-status-summary-csv.ts`；`GET /ops/workers/status/summary/export`；`ops_workers_status_summary_csv`；同步计划/审批策略/里程碑/Worker 汇总导出按钮 |
| **测试** | `loop-150-153.test.ts` |

### Loop 154 — 定价快照专用导出路径（P0/P5）

| 项 | 内容 |
|----|------|
| **实现** | `GET /reports/pricing-snapshot/export`；Web `downloadPricingSnapshotCsv` 指向专用路径 |
| **测试** | `loop-154-157.test.ts` |

### Loop 155 — 跨渠道 Guard CSV（P5-01）

| 项 | 内容 |
|----|------|
| **实现** | `cross-channel-guard-csv.ts`；`GET /skus/:skuId/cross-channel-guard/export`；`cross_channel_guard_csv` |
| **测试** | `loop-154-157.test.ts` |

### Loop 156 — Digest 计划 CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `digest-schedule-csv.ts`；`GET /agent/digest/schedule/export`；`digest_schedule_csv` |
| **测试** | `loop-154-157.test.ts` |

### Loop 157 — 动态调价规则 CSV + Web（P2-E3-03）

| 项 | 内容 |
|----|------|
| **实现** | `dynamic-repricing-rule-view.ts` + `dynamic-repricing-rule-csv.ts`；`GET /listings/:id/dynamic-repricing-rule/export`；`dynamic_repricing_rule_csv`；定价/Copilot/竞品页导出按钮 |
| **测试** | `loop-154-157.test.ts`、`loop-154-157-csv.test.ts` |

### Loop 158 — SKU 重算队列 CSV（P3/P5）

| 项 | 内容 |
|----|------|
| **实现** | `buildSkuRepricingQueueRows`；`GET /skus/:skuId/repricing-queue/export`；`repricing_queue_sku_csv` |
| **测试** | `loop-158-161.test.ts` |

### Loop 159 — 重算批分片计划 CSV（P5-05）

| 项 | 内容 |
|----|------|
| **实现** | `repricing-batch-shard-plan-csv.ts`；`GET .../repricing-batch/shard-plan/export`；`repricing_batch_shard_plan_csv` |
| **测试** | `loop-158-161.test.ts`、`loop-158-161-csv.test.ts` |

### Loop 160 — SKU 类目规则模板 CSV（P2-E3-03）

| 项 | 内容 |
|----|------|
| **实现** | `sku-category-rule-template-csv.ts`；`GET /skus/:skuId/category-rule-template/export`；`sku_category_rule_template_csv` |
| **测试** | `loop-158-161.test.ts`、`loop-158-161-csv.test.ts` |

### Loop 161 — 对账报表专用导出 + Web（P3-E3-01）

| 项 | 内容 |
|----|------|
| **实现** | `GET /reports/reconciliation-alerts/export`；指挥中心 SKU 队列/分片计划/对账报表导出；策略页 SKU 类目模板导出 |
| **测试** | `loop-158-161.test.ts` |

### Loop 162 — 定价上下文 CSV（P0-E4-07 / P2）

| 项 | 内容 |
|----|------|
| **实现** | `pricing-context-view.ts` + `pricing-context-csv.ts`；`GET /skus/:skuId/pricing-context/export`；`pricing_context_csv` |
| **测试** | `loop-162-165.test.ts`、`loop-162-165-csv.test.ts` |

### Loop 163 — 重算批作业单条 CSV（P5-05）

| 项 | 内容 |
|----|------|
| **实现** | `GET /repricing-batch/jobs/:jobId/export`；`repricing_batch_job_csv` |
| **测试** | `loop-162-165.test.ts` |

### Loop 164 — 类目模板单条 CSV（P5-02）

| 项 | 内容 |
|----|------|
| **实现** | `GET /category-rule-templates/:categoryId/export`；`category_rule_template_csv` |
| **测试** | `loop-162-165.test.ts` |

### Loop 165 — Copilot 会话 CSV + Web（P4 / SDD §12）

| 项 | 内容 |
|----|------|
| **实现** | `copilot-session-csv.ts`；`GET /agent/copilot/sessions/:sessionId/export`；`copilot_session_csv`；定价/策略/指挥中心/Copilot 导出按钮 |
| **测试** | `loop-162-165.test.ts`、`loop-162-165-csv.test.ts` |

### Loop 166 — Price Version CSV（P0-E4-05 / TC-INT-VER-003）

| 项 | 内容 |
|----|------|
| **实现** | `price-version-csv.ts`；`GET /price-versions/:versionId/export`；`price_version_csv` |
| **测试** | `loop-166-169.test.ts`、`loop-166-169-csv.test.ts` |

### Loop 167 — Version 备份行 CSV（X-05）

| 项 | 内容 |
|----|------|
| **实现** | `version-backup-csv.ts`；`GET /ops/version-backup/export`；`version_backup_rows_csv` |
| **测试** | `loop-166-169.test.ts`、`loop-166-169-csv.test.ts` |

### Loop 168 — P5 就绪清单 CSV（P5）

| 项 | 内容 |
|----|------|
| **实现** | `p5-readiness-csv.ts`；`GET /product/readiness/p5/export`；`p5_readiness_csv` |
| **测试** | `loop-166-169.test.ts`、`loop-166-169-csv.test.ts` |

### Loop 169 — 单店铺 CSV + Web（P1-E1）

| 项 | 内容 |
|----|------|
| **实现** | `GET /shops/:shopId/export`；`shop_csv`；指挥中心/通道/就绪页相关导出按钮 |
| **测试** | `loop-166-169.test.ts` |

### Loop 170 — P3 就绪清单 CSV（P3）

| 项 | 内容 |
|----|------|
| **实现** | `p3-readiness-csv.ts`；`GET /product/readiness/p3/export`；`p3_readiness_csv` |
| **测试** | `loop-170-173.test.ts`、`loop-170-173-csv.test.ts` |

### Loop 171 — P4 就绪清单 CSV（P4 / SEC-004）

| 项 | 内容 |
|----|------|
| **实现** | `p4-readiness-csv.ts`；`GET /product/readiness/p4/export`；`p4_readiness_csv` |
| **测试** | `loop-170-173.test.ts`、`loop-170-173-csv.test.ts` |

### Loop 172 — 单条共享费用模板 CSV（P5-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /shared-fee-templates/:templateId/export`；`shared_fee_template_csv`（`fee_template_id`） |
| **测试** | `loop-170-173.test.ts` |

### Loop 173 — 租户共享费用模板 CSV + Web（P5-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /tenants/:tenantId/shared-fee-templates/export`；`tenant_shared_fee_templates_csv`；就绪/策略/Copilot 导出按钮 |
| **测试** | `loop-170-173.test.ts` |

### Loop 174 — 单 SKU 目录行 CSV（P0-E2-01）

| 项 | 内容 |
|----|------|
| **实现** | `GET /skus/:skuId/export`；`sku_catalog_csv` |
| **测试** | `loop-174-177.test.ts` |

### Loop 175 — Listing 绑定 CSV（P1-E2）

| 项 | 内容 |
|----|------|
| **实现** | `listing-csv.ts`；`GET /listings/:listingId/export`；`listing_csv` |
| **测试** | `loop-174-177.test.ts`、`loop-174-177-csv.test.ts` |

### Loop 176 — 单条 HS 关税 CSV（P0-E2-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /tariff-hs-rates/:hsCode/export`；`tariff_hs_rate_csv` |
| **测试** | `loop-174-177.test.ts` |

### Loop 177 — 单条 FX 汇率 CSV + Web（P0-E2-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /fx-rates/:base/:quote/export`；`fx_rate_csv`；定价/渠道/运维导出按钮 |
| **测试** | `loop-174-177.test.ts` |

### Loop 178 — 单条 Cost Sheet CSV（P0-E2-02）

| 项 | 内容 |
|----|------|
| **实现** | `GET /skus/:skuId/cost-sheets/:sheetId/export`；`cost_sheet_csv` |
| **测试** | `loop-178-181.test.ts`、`loop-178-181-csv.test.ts` |

### Loop 179 — 单条竞品 Offer CSV（P2-E1-01）

| 项 | 内容 |
|----|------|
| **实现** | `GET /competitor-offers/:offerId/export`；`competitor_offer_csv` |
| **测试** | `loop-178-181.test.ts` |

### Loop 180 — 单条对账告警 CSV（P3-E3-01 / TC-INT-RECON-001）

| 项 | 内容 |
|----|------|
| **实现** | `GET /reconciliation-alerts/:alertId/export`；`reconciliation_alert_csv` |
| **测试** | `loop-178-181.test.ts` |

### Loop 181 — Cost Sheet / 竞品 / 对账 Web

| 项 | 内容 |
|----|------|
| **实现** | 定价页最新 cost sheet、竞品页所选 offer、运维中心首条告警 CSV 导出按钮 |
| **测试** | `loop-178-181.test.ts` |

### Loop 182 — 单条 Listing 同步作业 CSV（P1-E2）

| 项 | 内容 |
|----|------|
| **实现** | `getListingSyncJob`；`GET /ops/listing-sync/jobs/:jobId/export`；`listing_sync_job_csv`（`sync_job_id`） |
| **测试** | `loop-182-185.test.ts` |

### Loop 183 — 单条 Digest 排队作业 CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `GET /agent/digest/jobs/:jobId/export`；`digest_queued_job_csv`（`digest_job_id`） |
| **测试** | `loop-182-185.test.ts`、`loop-182-185-csv.test.ts` |

### Loop 184 — 单条 Worker 心跳 CSV（P0-E1-05）

| 项 | 内容 |
|----|------|
| **实现** | `getWorkerHeartbeat`；`GET /ops/workers/status/:workerId/export`；`worker_heartbeat_csv` |
| **测试** | `loop-182-185.test.ts` |

### Loop 185 — 同步 / Digest / Worker Web

| 项 | 内容 |
|----|------|
| **实现** | 运维最新 sync job 与首个 worker 心跳；Copilot 最新 digest 排队作业导出按钮 |
| **测试** | `loop-182-185.test.ts` |

### Loop 186 — 单条 Digest 派发作业 CSV（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `getDigestDispatch`；`GET /agent/digest/dispatches/:jobId/export`；`digest_dispatch_csv`（`dispatch_job_id`） |
| **测试** | `loop-186-189.test.ts`、`loop-186-189-csv.test.ts` |

### Loop 187 — 单条渠道沙箱事件 CSV（P1-E2）

| 项 | 内容 |
|----|------|
| **实现** | `getChannelSandboxEvent`；`GET /channels/sandbox/events/:eventId/export`；`channel_sandbox_event_csv`（`sandbox_event_id`） |
| **测试** | `loop-186-189.test.ts` |

### Loop 188 — 单条 Digest 死信作业 CSV（TC-NFR-REL-004）

| 项 | 内容 |
|----|------|
| **实现** | `GET /agent/digest/jobs/dead-letter/:jobId/export`；`digest_dead_letter_job_csv`（`digest_job_id`，须 `dead_letter`） |
| **测试** | `loop-186-189.test.ts`（含 dead-letter summary 路由顺序） |

### Loop 189 — 单条 Agent 工具审计 CSV + Web

| 项 | 内容 |
|----|------|
| **实现** | `GET /agent/tool-audit/:auditId/export`；`agent_tool_audit_csv`（`audit_id`）；Copilot 最近派发 / DLQ / 审计行；Channels 首条沙箱事件 |
| **测试** | `loop-186-189.test.ts` |

### Loop 190 — 单条价格观测 CSV（P2-E1-03）

| 项 | 内容 |
|----|------|
| **实现** | `getObservation`；`GET /price-observations/:observationId/export`；`price_observation_csv`（`observation_id`） |
| **测试** | `loop-190-193.test.ts`、`loop-190-193-csv.test.ts` |

### Loop 191 — 单条重算事件 CSV（P2-E3-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /repricing-events/:eventId/export`；`repricing_event_csv`（`repricing_event_id`） |
| **测试** | `loop-190-193.test.ts` |

### Loop 192 — 调价单索引行 CSV（P0-E5-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /adjustment-batches/:batchId/index/export`；`adjustment_batch_index_csv`（`batch_id`） |
| **测试** | `loop-190-193.test.ts` |

### Loop 193 — 按日期 Digest CSV + Web（P4-E1-07）

| 项 | 内容 |
|----|------|
| **实现** | `GET /agent/digest/daily/:date/export`；`agent_digest_date_csv`（`date`）；竞品/调价/Copilot 单行导出按钮 |
| **测试** | `loop-190-193.test.ts` |

### Loop 194 — 单条定价快照行 CSV（P0-E2）

| 项 | 内容 |
|----|------|
| **实现** | `GET /reports/pricing-snapshots/:skuId/rows/:channel/export`；`pricing_snapshot_row_csv`（`sku_id` + `channel`） |
| **测试** | `loop-194-197.test.ts`、`loop-194-197-csv.test.ts` |

### Loop 195 — 跨渠道看板 SKU 行 CSV（P3-E3-04）

| 项 | 内容 |
|----|------|
| **实现** | `GET /cross-channel/dashboard/:skuId/export`；`cross_channel_dashboard_row_csv` |
| **测试** | `loop-194-197.test.ts` |

### Loop 196 — 竞品曲线单日 CSV（P2-E1-03）

| 项 | 内容 |
|----|------|
| **实现** | `GET /listings/:listingId/competitors/curve/:curveDate/export`；`competitor_curve_point_csv`（`curve_date`） |
| **测试** | `loop-194-197.test.ts` |

### Loop 197 — 单条 Agent 工具目录行 CSV + Web（P4-E1-02）

| 项 | 内容 |
|----|------|
| **实现** | `getAgentTool`；`GET /agent/tools/:toolName/export`；`agent_tool_row_csv`；运维/看板/竞品/Copilot 导出按钮 |
| **测试** | `loop-194-197.test.ts` |

### Loop 198 — 单条 P4 Agent 就绪检查 CSV（P4-E1）

| 项 | 内容 |
|----|------|
| **实现** | `GET /agent/readiness/checks/export?check_id=`；`agent_readiness_check_csv` |
| **测试** | `loop-198-201.test.ts`、`loop-198-201-csv.test.ts` |

### Loop 199 — 单条产品里程碑 CSV（P3/P4/P5）

| 项 | 内容 |
|----|------|
| **实现** | `GET /agent/milestones/:milestoneId/export`；`agent_milestone_csv`（`milestone_id`） |
| **测试** | `loop-198-201.test.ts` |

### Loop 200 — 单条产品就绪检查 CSV（P3/P4/P5）

| 项 | 内容 |
|----|------|
| **实现** | `GET /product/readiness/checks/export?check_id=`；`product_readiness_check_csv` |
| **测试** | `loop-198-201.test.ts`（含带 `/` 的 check id） |

### Loop 201 — 单条特性开关 CSV + Web（P5）

| 项 | 内容 |
|----|------|
| **实现** | `getFeatureFlagValue`；`GET /feature-flags/:flagKey/export`；`feature_flag_csv`；Copilot / 产品就绪页按钮 |
| **测试** | `loop-198-201.test.ts` |

---

## 本地命令

```bash
npm ci && npm run build && npm test
npm run test:smoke    # API E2E scaffold
npm run test:e2e      # Playwright (starts BFF + web preview)
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
| v2.3 | 2026-07-21 | Loop 14 |
| v2.4 | 2026-07-21 | Loop 15 |
| v2.5 | 2026-07-21 | Loop 16 |
| v2.6 | 2026-07-21 | Loop 17 |
| v2.7 | 2026-07-21 | Loop 18 |
| v2.8 | 2026-07-21 | Loop 19 |
| v2.9 | 2026-07-21 | Loop 20 |
| v3.0 | 2026-07-21 | Loop 21 |
| v3.1 | 2026-07-21 | Loop 22 |
| v3.2 | 2026-07-21 | Loop 23 |
| v3.3 | 2026-07-21 | Loop 24 |
| v3.4 | 2026-07-21 | Loop 25 |
| v3.5 | 2026-07-21 | Loop 26 |
| v3.6 | 2026-07-21 | Loop 27 |
| v3.7 | 2026-07-21 | Loop 28 |
| v3.8 | 2026-07-21 | Loop 29 |
| v4.2 | 2026-07-21 | Loop 33 |
| v4.3 | 2026-07-21 | Loop 34 |
| v4.4 | 2026-07-21 | Loop 35 |
| v4.7 | 2026-07-21 | Loop 39–42 Phase 2 收官 |
| v4.8 | 2026-07-21 | Loop 44 P5-05 repricing batch shards |
| v4.9 | 2026-07-21 | Loop 45 repricing batch worker + recompute-all |
| v5.0 | 2026-07-21 | Loop 43+46 JWT HS256 and JWKS RS256 |
| v5.1 | 2026-07-22 | Loop 47 JWT iss/aud claims |
| v5.2 | 2026-07-22 | Loop 48 repricing batch job queue |
| v5.3 | 2026-07-22 | Loop 49 PG repricing batch job store |
| v5.4 | 2026-07-22 | Loop 70–73 HS tariff, adjustment preview/import, Ops UI |
| v5.5 | 2026-07-22 | Loop 74–77 cost sheets, landed from sheet, CSV batch apply |
| v5.6 | 2026-07-22 | Loop 78–81 waterfall export, policy patch, listing sync jobs |
| v5.7 | 2026-07-22 | Loop 82–85 waterfall export store, sync schedule, competitor curve |
| v5.8 | 2026-07-22 | Loop 86–89 sync run-due, curve/batch CSV exports, Ops Web |
| v5.9 | 2026-07-22 | Loop 90–93 sync jobs feed, direct CSV, cron/force, Ops jobs UI |
| v6.0 | 2026-07-22 | Loop 94–97 sync status, jobs/recon CSV exports, Channels Web |
| v6.1 | 2026-07-22 | Loop 98–101 cross-channel/cost sheet/repricing batch CSV + Web |
| v6.2 | 2026-07-22 | Loop 102–105 digest/tariff CSV, SKU policy batch, Web |
| v6.3 | 2026-07-22 | Loop 106–109 FX/audit CSV, digest run-due, Copilot/Ops Web |
| v6.4 | 2026-07-22 | Loop 110–113 tenant pricing/sandbox/DLQ CSV + Web |
| v6.5 | 2026-07-22 | Loop 114–117 repricing/digest queue/dispatches/workers CSV + Web |
| v6.6 | 2026-07-22 | Loop 118–121 price history/repricing events/adjustment index CSV + Web |
| v6.7 | 2026-07-22 | Loop 122–125 SKU/shops/category templates CSV + Web |
| v6.8 | 2026-07-22 | Loop 126–129 competitor offers/fee templates/ops metrics CSV + Web |
| v6.9 | 2026-07-22 | Loop 130–133 reconciliation/sync status/listing sync/agent tools CSV + Web |
| v7.0 | 2026-07-22 | Loop 134–137 repricing batch summary, ingest status, feature flags CSV + Web |
| v7.1 | 2026-07-22 | Loop 138–141 agent/product readiness and competitor anchor CSV + Web |
| v7.2 | 2026-07-22 | Loop 142–145 digest summary, channel adapters, rule compiler CSV + Web |
| v7.3 | 2026-07-22 | Loop 146–149 auth, sandbox status, digest DLQ summary CSV + Web |
| v7.4 | 2026-07-22 | Loop 150–153 listing sync schedule, milestones, approval policy, workers summary CSV + Web |
| v7.5 | 2026-07-22 | Loop 154–157 pricing snapshot export path, cross-channel guard, digest schedule, dynamic rule CSV + Web |
| v7.6 | 2026-07-22 | Loop 158–161 SKU repricing queue, shard plan, category template, reconciliation report export + Web |
| v7.7 | 2026-07-23 | Loop 162–165 pricing context, repricing batch job, category template, copilot session CSV + Web |
| v7.8 | 2026-07-23 | Loop 166–169 price version, version backup rows, P5 readiness, shop CSV + Web |
| v7.9 | 2026-07-23 | Loop 170–173 P3/P4 readiness, shared fee template and tenant fee templates CSV + Web |
| v7.10 | 2026-07-23 | Loop 174–177 SKU row, listing, HS tariff row, FX rate row CSV + Web |
| v7.11 | 2026-07-23 | Loop 178–181 cost sheet, competitor offer, reconciliation alert CSV + Web |
| v7.12 | 2026-07-23 | Loop 182–185 listing sync job, digest queued job, worker heartbeat CSV + Web |
| v7.13 | 2026-07-23 | Loop 186–189 digest dispatch, sandbox event, dead-letter job, tool audit row CSV + Web |
| v7.14 | 2026-07-23 | Loop 190–193 price observation, repricing event, adjustment index row, digest date CSV + Web |
| v7.15 | 2026-07-23 | Loop 194–197 pricing snapshot row, cross-channel row, curve point, agent tool row CSV + Web |
| v7.16 | 2026-07-23 | Loop 198–201 readiness check, milestone, product check, feature flag row CSV + Web |
