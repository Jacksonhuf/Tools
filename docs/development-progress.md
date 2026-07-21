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

> **本线程 Development Loop 计划内迭代已结束。** 未实现的 P0–P5  backlog 见 [development-task-list.md](./development-task-list.md)。

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
| v4.5 | 2026-07-21 | Loop 36 收官 |
