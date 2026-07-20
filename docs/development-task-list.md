# 开发任务清单：墨西哥跨境定价与调价工具

| 属性 | 内容 |
|------|------|
| 关联 PRD | [PRD-mexico-cross-border-pricing.md](./PRD-mexico-cross-border-pricing.md) |
| 关联 SDD | [solution-design.md](./solution-design.md) |
| 关联测试 | [test-cases.md](./test-cases.md) |
| 进度（Development Loop） | [development-progress.md](./development-progress.md) |
| 版本 | v1.1 |
| 说明 | 任务按阶段分组；**开发流程见 [development-progress.md](./development-progress.md)** |

**图例**

- **Epic**：大项
- **Story**：可验收用户故事级任务
- **Task**：实现子项

---

## 文档与测试基线（Doc / QA）

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|----|------|--------|------|----------|
| DOC-01 | 维护 PRD / SDD / 测试用例版本一致 | P0 | — | 变更互相引用 |
| DOC-02 | 从 SDD §10 生成 OpenAPI 初稿并随实现更新 | P0 | SDD | `openapi/v1.yaml` 可校验 |
| DOC-03 | `packages/pricing-engine` 模块边界按 SDD §15 落盘 | P0 | P0-E1-01 | 目录与文档一致 |

---

## 阶段 P0：定价内核与 Web 基础

### Epic P0-E1：工程底座

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P0-E1-01 | monorepo/多服务仓库结构、CI、环境配置（dev/staging） | P0 | — | 可构建、可部署空壳 |
| P0-E1-02 | API Gateway + BFF 骨架、统一错误码、请求 ID | P0 | P0-E1-01 | 健康检查、OpenAPI 雏形 |
| P0-E1-03 | 认证（SSO/OIDC 或邮箱+MFA 占位）、RBAC 模型与中间件 | P0 | P0-E1-02 | TC-API-AUTH-001/002 |
| P0-E1-04 | PostgreSQL（主库）+ 迁移工具；Redis 缓存 | P0 | P0-E1-01 | 迁移可重复执行 |
| P0-E1-05 | 异步队列与 Worker 骨架 | P0 | P0-E1-01 | TC-NFR-REL-004 可测 |
| P0-E1-06 | 对象存储（导出文件）与签名 URL | P1 | P0-E1-01 | 可上传下载 |
| P0-E1-07 | CI Jobs：`ci-unit-engine` 等占位（见 test-cases §16） | P0 | P0-E1-01 | Pipeline 绿 |

### Epic P0-E2：主数据与成本

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P0-E2-01 | Product / SKU CRUD、HS、重量体积（SDD §5.1） | P0 | P0-E1-04 | API + 列表筛选 |
| P0-E2-02 | Cost Sheet、头程分摊规则枚举 | P0 | P0-E2-01 | 单 SKU 多批次成本 |
| P0-E2-03 | 汇率表（来源、生效时间、buffer%） | P0 | P0-E1-04 | TC-UNIT-COST-001 |
| P0-E2-04 | 关税/HS 税率表（表驱动 MVP） | P1 | P0-E2-01 | TC-UNIT-COST-002 |
| P0-E2-05 | Landed Cost 服务（SDD §6.2） | P0 | P0-E2-02–04 | GL-COST-001/002 |

### Epic P0-E3：费用模板与定价策略

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P0-E3-01 | Fee Template 模型（SDD §5.2） | P0 | P0-E2-01 | CRUD |
| P0-E3-02 | 瀑布层枚举与 WaterfallLine schema（SDD §7） | P0 | — | 与 SDD 表一致 |
| P0-E3-03 | Pricing Policy（cost / competitive / competitive_with_floor） | P0 | P0-E3-01 | SKU 可绑定 |
| P0-E3-04 | IVA/含税策略、MXN 舍入（SDD §14 假设） | P0 | P0-E3-02 | TC-UNIT-COST-005/006 |

### Epic P0-E4：定价引擎 v1

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P0-E4-01 | `packages/pricing-engine` 成本正向（SDD §6.4） | P0 | P0-E2-05, P0-E3 | TC-UNIT-COST-003 |
| P0-E4-02 | 成本反向 simulate（SDD §6.6） | P1 | P0-E4-01 | TC-UNIT-COST-004 |
| P0-E4-03 | 竞争定价 + floor max（SDD §6.5） | P0 | P0-E4-01 | TC-UNIT-COMP-001–003 |
| P0-E4-04 | WaterfallBuilder | P0 | P0-E4-01–03 | TC-UNIT-COMP-005 |
| P0-E4-05 | Price Version 只增存储（SDD §5.5） | P0 | P0-E1-04 | TC-INT-VER-001/002 |
| P0-E4-06 | Guard 链（SDD §6.7） | P0 | P0-E4-01 | TC-UNIT-COST-007 |
| P0-E4-07 | BFF `GET pricing-context`、`POST simulate`（SDD §10.1–10.2） | P0 | P0-E4-04 | TC-API-VER-004/005 |

### Epic P0-E5：调价与导入导出

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P0-E5-01 | Adjustment Batch 状态机（SDD §5.6） | P0 | P0-E4-05 | TC-API-ADJ-001 |
| P0-E5-02 | 审批规则（降幅/毛利阈值） | P1 | P0-E5-01 | TC-API-ADJ-002 |
| P0-E5-03 | CSV 导入成本/建议价；导出瀑布 | P1 | P0-E2, P0-E4 | 模板文档 |
| P0-E5-04 | 影响预览 API | P1 | P0-E5-01 | 预览 API |
| P0-E5-05 | `POST price-versions` 发布（SDD §10.3） | P0 | P0-E4-06 | TC-API-ADJ-003 |

### Epic P0-E6：Web 前端与 i18n 基础

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P0-E6-01 | SPA 脚手架、布局、路由 | P0 | P0-E1-02 | 可登录 |
| P0-E6-02 | i18n zh-CN / en / es-MX | P0 | P0-E6-01 | TC-E2E-I18N-003 |
| P0-E6-03 | `packages/i18n-format` formatMoney/日期 | P0 | P0-E6-02 | TC-UNIT-I18N-001/002 |
| P0-E6-04 | SKU 列表、详情、成本页 | P0 | P0-E2 API | CRUD 可用 |
| P0-E6-05 | 瀑布组件（成本模式） | P0 | P0-E4-07 | 模拟杆交互 |
| P0-E6-06 | 竞争模式瀑布 + Floor 对照 | P0 | P0-E4-03 | TC-UNIT-COMP-002 UI |
| P0-E6-07 | 调价单列表与审批 UI | P1 | P0-E5-01 | TC-E2E-ADJ-004 |
| P0-E6-08 | 费用模板、Policy 配置页 | P1 | P0-E3 | 运营可配置 |

### Epic P0-E7：黄金用例与引擎回归

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P0-E7-01 | 落地 `tests/golden/GL-COST-*.json`（test-cases §17） | P0 | P0-E4 | ci-unit-engine 全绿 |
| P0-E7-02 | 落地 `tests/golden/GL-COMP-*.json` + GL-FLOOR | P0 | P0-E4-03 | TC-UNIT-COMP-* / FLOOR |
| P0-E7-03 | 引擎变更门禁：PR 必跑 ci-unit-engine | P0 | P0-E1-07 | 分支保护 |
| P0-E7-04 | 术语表 i18n key（瀑布层、IVA） | P1 | P0-E6-02 | 三语完整 |

### Epic P0-E8：测试基础设施

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P0-E8-01 | 测试容器 PostgreSQL/Redis fixture | P0 | P0-E1-04 | INT 测试可跑 |
| P0-E8-02 | `ci-int-pricing`：Version/Guard 集成测 | P0 | P0-E4-05, P0-E8-01 | TC-INT-VER-* |
| P0-E8-03 | `ci-api`：Supertest/契约测骨架 | P1 | P0-E4-07 | TC-API-* |
| P0-E8-04 | Playwright E2E smoke 脚手架 | P2 | P0-E6 | ci-e2e-smoke 占位 |

**P0 里程碑**：运营可维护 SKU/成本/策略，分模式瀑布与 simulate；调价单与 Version；**P0 测试门禁**（test-cases §16）通过。

---

## 阶段 P1：双通道 Listing 与分通道 Floor

### Epic P1-E1：通道与店铺

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P1-E1-01 | Channel 枚举 MERCADO_LIBRE / AMAZON_MX | P0 | P0-E3 | SDD §9 |
| P1-E1-02 | Shop 凭证加密（SDD §4） | P0 | P0-E1-04 | TC-NFR-SEC-003 |
| P1-E1-03 | ML OAuth | P0 | P1-E1-02 | 可刷新 token |
| P1-E1-04 | Amazon SP-API LWA（MX） | P0 | P1-E1-02 | 可刷新 token |

### Epic P1-E2：Listing 同步（读）

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P1-E2-01 | `MercadoLibreAdapter.pullListing` | P0 | P1-E1-03 | TC-INT-CH-001 |
| P1-E2-02 | `AmazonMxSpApiAdapter.pullListing` | P0 | P1-E1-04 | TC-INT-CH-002 |
| P1-E2-03 | SKU ↔ Listing 绑定（唯一 sku+channel） | P0 | P1-E2-01–02 | SDD §5.3 |
| P1-E2-04 | 定时同步 + 手动刷新 | P1 | P0-E1-05 | 任务可追踪 |

### Epic P1-E3：分通道费用与瀑布

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P1-E3-01 | ML 佣金/履约费模板 | P0 | P0-E3-01 | 可维护 |
| P1-E3-02 | Amazon Referral/FBA 模板 | P0 | P0-E3-01 | 可维护 |
| P1-E3-03 | `floor_ml` / `floor_amazon`（SDD §6.3） | P0 | P1-E3-01–02 | TC-UNIT-FLOOR-001/002 |
| P1-E3-04 | Price Version 增加 channel + listing_id | P0 | P0-E4-05 | TC-INT-FLOOR-003 |
| P1-E3-05 | 双列 Listing UI（ML \| Amazon） | P0 | P1-E2-03 | E2E 双列加载 |
| P1-E3-06 | 落地 `tests/golden/GL-FLOOR-*.json` | P0 | P1-E3-03 | P0-E7-03 扩展 |

**P1 里程碑**：双通道读价；分通道 Floor 与瀑布；CH 集成测 mock 通过。

---

## 阶段 P2：竞品跟踪与 Suggested 动态重算

### Epic P2-E1：竞品主数据

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P2-E1-01 | Competitor Offer（SDD §5.4） | P0 | P1-E1 | CRUD API |
| P2-E1-02 | 多竞品绑定 + 映射审计 | P0 | P2-E1-01 | audit_logs |
| P2-E1-03 | 手工录入 + price_observations 历史 | P0 | P2-E1-01 | 曲线 API |
| P2-E1-04 | effective_price 聚合（SDD §8.2） | P0 | P2-E1-01 | TC-UNIT-COMP-004/006 |

### Epic P2-E2：采集管道

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P2-E2-01 | Tier 调度（SDD §8.1） | P0 | P0-E1-05 | TC-INT-ING-005 |
| P2-E2-02 | ML 竞品采集 | P0 | P1-E1-03, P2-E1 | TC-INT-ING-001 |
| P2-E2-03 | Amazon Buy Box 采集 | P0 | P1-E1-04, P2-E1 | TC-INT-ING-002 |
| P2-E2-04 | 归一化 MXN、含运费开关 | P0 | P2-E2-02–03 | TC-INT-ING-003 |
| P2-E2-05 | Stale 检测 + listing 冻结标志 | P0 | P2-E2-01 | TC-INT-ING-004 |
| P2-E2-06 | 合规采集 Feature Flag | P2 | 法务 | 默认关闭 |

### Epic P2-E3：事件与动态 Suggest

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P2-E3-01 | 事件总线 + CompetitorPriceChanged | P0 | P2-E2 | TC-INT-EVT-001 |
| P2-E3-02 | Redis 去抖 5min（SDD §8.4） | P0 | P2-E3-01 | TC-INT-EVT-002 |
| P2-E3-03 | dynamic_repricing_rules CRUD | P0 | P0-E3 | SDD §5.6 |
| P2-E3-04 | svc-repricing 运行时 → Suggested | P0 | P0-E4, P2-E3 | TC-INT-EVT-003/004 |
| P2-E3-05 | 通知（三语模板） | P1 | P2-E3-04 | — |
| P2-E3-06 | 竞品曲线 UI、Suggested vs Active | P0 | P2-E1-03 | — |
| P2-E3-07 | `ci-int-channel` 采集 mock 套件 | P0 | P2-E2 | test-cases §16 |

**P2 里程碑**：自动采集 + Suggested；EVT/ING 集成测绿。

---

## 阶段 P3：动态 Pending/Auto 与渠道回写

### Epic P3-E1：Guard 增强与发布

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P3-E1-01 | 冷却、日上限、min_gap（SDD §6.7） | P0 | P2-E3-03 | TC-INT-GUARD-001–003 |
| P3-E1-02 | 墨西哥营业时间窗 | P1 | P3-E1-01 | — |
| P3-E1-03 | auto_pending / auto_active | P0 | P2-E3-04 | 默认 Suggest |
| P3-E1-04 | Version 审计字段（SDD §5.5） | P0 | P2-E3 | TC-INT-VER-003 |
| P3-E1-05 | unfreeze API | P1 | P3-E2-05 | TC-API-GUARD-005 |

### Epic P3-E2：通道适配器（写）

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P3-E2-01 | ML publishPrice | P0 | P1-E1-03 | TC-INT-CH-003 |
| P3-E2-02 | Amazon publishPrice | P0 | P1-E1-04 | TC-INT-CH-004 |
| P3-E2-03 | 步长学习与重试 | P1 | P3-E2-01–02 | TC-INT-CH-005 |
| P3-E2-04 | 部分成功 publish_status | P0 | P3-E2-01–02 | TC-INT-CH-006 |
| P3-E2-05 | 回写失败熔断 dynamic rule | P0 | P3-E2-01–02 | TC-INT-GUARD-004 |
| P3-E2-06 | idempotency_key 发布 | P1 | P3-E2-01 | SDD §13 |

### Epic P3-E3：对账与指挥中心

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P3-E3-01 | 渠道对账任务 | P1 | P1-E2 | TC-INT-RECON-001 |
| P3-E3-02 | 指挥中心批量 Pending | P1 | P2-E3 | TC-E2E-OPS-002 |
| P3-E3-03 | Buy Box 展示与 anchor 开关 | P1 | P2-E2-03 | — |
| P3-E3-04 | 跨通道价差 Dashboard | P2 | P1-E3 | — |
| P3-E3-05 | TC-NFR-REL-003 采集失败不降价 自动化 | P0 | P2-E2 | 门禁 |

**P3 里程碑**：可配置回写；P0 Guard/CH/NFR 门禁全绿。

---

## 阶段 P4：混合 Agent

### Epic P4-E1：Agent 服务

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P4-E1-01 | Agent 部署、无 DB 写（SDD §12） | P0 | P0-E1 | TC-NFR-SEC-004 |
| P4-E1-02 | 工具：context/versions/simulate | P0 | P0-E4, P2 | TC-INT-AGENT-001 |
| P4-E1-03 | Copilot UI 三语 | P1 | P0-E6 | — |
| P4-E1-04 | 工具调用审计 | P0 | P4-E1-02 | TC-INT-AGENT-004 |
| P4-E1-05 | tool_create_adjustment_draft | P1 | P0-E5 | TC-INT-AGENT-002 |
| P4-E1-06 | NL→Rule 编译 + 确认 UI | P1 | P2-E3-03 | TC-E2E-AGENT-003 |
| P4-E1-07 | 每日 digest | P2 | P2-E3-05 | — |

**P4 里程碑**：Copilot 可解释；无 publish 能力证明（SEC-004）。

---

## 阶段 P5：增强与规模化

| ID | 任务 | 优先级 | 依赖 | 验收标准 / 测试 |
|----|------|--------|------|-----------------|
| P5-01 | Cross-channel Guard | P2 | P3 | SDD 可选 |
| P5-02 | 品类规则模板继承 | P1 | P2-E3-03 | — |
| P5-03 | 报表导出 | P2 | P3 | — |
| P5-04 | 多租户模板共享 | P2 | P0-E1 | tenant 隔离测 |
| P5-05 | 批量重算分片 | P1 | P2-E3 | TC-NFR-PERF-001 |
| P5-06 | 每周 ci-nfr-weekly | P2 | P5-05 | TC-NFR-PERF-002 |

---

## 横切任务（全阶段）

| ID | 任务 | 说明 / 测试 |
|----|------|-------------|
| X-01 | 可观测性（SDD §13 指标） | `pricing_calc_duration`, `repricing_lag` |
| X-02 | 特性开关 Auto/爬虫/Agent | 分环境 |
| X-03 | 安全扫描 | 双周 |
| X-04 | OpenAPI + 运营手册 | DOC-02 |
| X-05 | Version 备份演练 | P3 前 |
| X-06 | 测试用例 ↔ 任务追溯表维护 | 与 test-cases 同步 |

---

## 建议排期与团队分工（参考）

| 小队 | 主要负责 Epic |
|------|----------------|
| **后端-定价** | P0-E2–E5, P0-E4, P0-E7, P2-E3, P3-E1 |
| **后端-集成** | P1-E1–E2, P2-E2, P3-E2 |
| **前端** | P0-E6, P1-E3-05, P2-E3-06, P3-E3, P4-E1-03 |
| **平台/QA** | P0-E1, P0-E8, X-*, NFR 门禁 |
| **算法/产品** | 黄金用例、P2-E1-04、Agent 提示词 |

**关键路径**：`P0-E4 引擎 + P0-E7/E8 测试` → `P1-E3 Floor` → `P2-E2 采集` → `P2-E3 事件` → `P3-E2 回写`。

---

## 任务统计（Story 级，v1.1）

| 阶段 | Story 数（约） |
|------|----------------|
| Doc/QA | 3 + Epic P0-E8(4) |
| P0 | 40 |
| P1 | 13 |
| P2 | 16 |
| P3 | 14 |
| P4 | 7 |
| P5 | 6 |
| 横切 | 6 |

---

## 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-07-20 | 初版，对齐 PRD v1.0 |
| v1.1 | 2026-07-20 | 新增 SDD/测试追溯；P0-E7/E8、DOC、各阶段 TC 验收列 |
| v1.1.1 | 2026-07-20 | 黄金用例 JSON 已落盘 `tests/golden/`（13 fixtures） |
