# PRD：墨西哥跨境电商定价与调价工具

| 属性 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 状态 | 草案（已评审对齐设计对话） |
| 产品代号 | MX-Pricing（暂定） |
| 主战场通道 | Mercado Libre、Amazon México |

---

## 1. 背景与目标

### 1.1 背景

跨境卖家在墨西哥市场销售时，需在 **采购/头程（多币种）** 与 **前台标价（MXN）** 之间建立可解释、可审计的定价链路，并应对 **Mercado Libre（ML）** 与 **Amazon MX** 不同的费用结构、竞品形态与回写规则。运营需要 **价格瀑布** 理解毛利构成；竞争场景需要 **竞品跟踪** 与 **受控的动态调价**，且不能满足于不可追责的「黑盒 AI 改价」。

### 1.2 产品目标

- 统一 SKU 成本与分通道费用模型，输出合规、可盈利的 **分通道 MXN 售价**。
- 提供 **成本定价** 与 **竞争定价** 两种模式，默认 **竞争优先 + 成本兜底**（`effective = max(match, floor)`）。
- 支持 **价格瀑布** 可视化（成本正向 / 竞争锚点叙事），每次对外生效价格绑定 **Price Version** 快照。
- 支持 **竞品近实时跟踪** 与 **动态调价**（Suggest / Pending / Auto 分档），含防振荡与熔断。
- 支持 **国际化**：界面与 Copilot **中文 / English / Español (es-MX)**；金额格式化与界面语言解耦。
- 架构采用 **混合模式**：**定价引擎为唯一算价真相**；Agent 仅只读解释、提议调价单草稿、自然语言编译规则（需人工确认）。

### 1.3 成功指标（建议）

| 指标 | 目标 |
|------|------|
| 单 SKU 定价上下文加载 + 瀑布渲染 | P95 &lt; 3s |
| 竞品变价 → Suggested 产出（T0 档位） | P95 &lt; 15min + 管道延迟 |
| 调价发布 | 100% 可追溯至 Version + 触发事件 |
| 渠道回写失败 | 自动熔断该 Listing 动态调价，不静默失败 |

### 1.4 目标用户

| 角色 | 典型诉求 |
|------|----------|
| 运营定价 | 瀑布改价、竞品跟价、批量活动 |
| 财务 | 毛利口径、Floor、审批 |
| 供应链 | 成本/汇率更新 |
| 品类负责人 | 品类规则、动态策略档位 |
| 墨西哥本地运营 | 西语界面、ML/Amazon 分通道操作 |

---

## 2. 范围

### 2.1 In Scope（一期规划总范围）

- Web 管理端（BFF + SPA/SSR）。
- SKU / Listing（ML + Amazon MX）主数据。
- 成本表、费用模板、定价策略（成本 / 竞争 / 竞争+兜底）。
- 定价引擎、瀑布组装、Price Version（只增不改）。
- 调价单、审批流（可配置阈值）、渠道价格回写适配器。
- 竞品 Offer 管理、分通道采集、事件驱动动态重算。
- i18n（zh-CN、en、es-MX）与货币格式化。
- 混合 Agent（分阶段）：Copilot 只读 → 提议草稿 → NL 编译规则。

### 2.2 Out of Scope（首期不做或另立项）

- 非 MX 站点（如 Amazon US）作为主战场。
- 纯 Agent 自动发布（无 Guard / Version）。
- 完整 OMS / 库存 / 订单（仅定价域；可提供只读对接点）。
- 法务未评估的激进爬虫方案（无 API 时走人工/合规备选）。

---

## 3. 架构原则

### 3.1 形态

**Web 为主 + API/BFF 为核心 + 异步任务队列**；Excel/CSV 导入导出为辅。

### 3.2 混合模式（Truth Engine + Agent Copilot + 编译式规则）

| 层 | 职责 |
|----|------|
| **定价引擎（权威）** | 双模式算价、瀑布、舍入、含税、Floor/Ceiling、分通道 `floor_ml` / `floor_amazon` |
| **Agent Copilot** | 三语解释、诊断、竞品叙事；**不写入 Active Price** |
| **策略编译器** | NL → AdjustmentRule / DynamicRule 草案 → **人工确认入库** |
| **发布路径（唯一）** | `Engine → Guard → Price Version → Publish` |

**铁律**：Agent 工具 **Read** 全开；**Propose** 有限；**Publish** 默认禁止。

### 3.3 逻辑架构

```
[Web] → [API Gateway / BFF] → [定价领域服务]
                              → [采集服务] → [事件总线] → [动态调价运行时]
                              → [Agent Service]（只读/提议工具）
[ERP/汇率/税则] ──接入──→ [成本与规则]
[ML API / Amazon SP-API] ←──→ [通道适配器]
[DB 主库 + Version 库] [队列] [对象存储-导出]
```

---

## 4. 墨西哥与跨境约束

- **币种**：采购 USD/CNY；售价 MXN；汇率来源、生效时间、FX buffer%。
- **到岸成本**：FOB + 国际段 + 关税（HS）+ 清关。
- **IVA**（16% 等）及可选 **IEPS**；策略区分含税/不含税标价，瀑布双轨展示一行对照。
- **本地履约**：海外仓/尾程、退货损耗、包装。
- **分通道平台费用**：ML 类目佣金、Full/自发货；Amazon Referral、FBA/FBM。

---

## 5. 领域模型（摘要）

| 实体 | 说明 |
|------|------|
| Product / SKU | 主数据、HS、重量体积 |
| Cost Sheet | 采购价、批次、头程分摊 |
| Fee Template | channel + category + fulfillment |
| Pricing Policy | 模式、毛利目标、舍入、含税策略 |
| Channel Listing | ML `item_id` / Amazon `ASIN`+Seller SKU |
| Competitor Offer | 分通道竞品绑定与观测 |
| Price Version | 不可变定价快照 + WaterfallLine[] |
| Adjustment Batch | 批量调价与审批 |
| Dynamic Repricing Rule | 触发器、动作、冷却、日上限 |
| Cross-channel Guard（可选） | 跨 ML/Amazon 价差护栏 |

**关系**：1 SKU → 0..1 Listing / 通道；竞品仅 **本通道** 进入 anchor；跨平台价仅 Dashboard 参考。

---

## 6. 定价模式

### 6.1 成本定价（Cost-based）

正向瀑布：COGS → 头程 → 关税 → 到岸 → 履约 → 佣金 → 支付 → 营销（可选）→ 目标利润 → 标价（IVA 层）→ 净入/毛利。

反向：输入目标售价或竞品参考，反推毛利或最高采购价。

### 6.2 竞争定价（Competitive）

- **锚点**：`anchor`（min/median/buy box 等）+ `offset`。
- **兜底**：`publish = round_tax(max(match, floor_channel))`。
- **瀑布**：竞品参考价 → 策略偏移 → 拟定标价 → 扣费 → 贡献毛利；对照 Floor 与「未跟价原因」。

### 6.3 策略枚举（SKU / Policy）

| 值 | 行为 |
|----|------|
| `cost` | 仅成本引擎 |
| `competitive` | 仅竞争（仍建议保留 Floor） |
| `competitive_with_floor` | **默认**：竞争优先 + 成本兜底 |

---

## 7. 价格瀑布（WaterfallLine）

每层字段：`layer_id`、`calc_type`（固定/成本%/售价%/阶梯）、`amount_mxn`、`rate`、`source`（手工/规则/API）、`editable`、`note`。

**交互**：折叠子项、毛利率/售价模拟杆、调价前后 Version 对比、分通道并排（ML | Amazon）。

---

## 8. 竞品跟踪与动态调价

### 8.1 实时性 SLA（产品承诺）

「近实时」= 可配置 **Tier**：

| Tier | 间隔 | 适用 |
|------|------|------|
| T0 | 5–15 min | 头部 Listing |
| T1 | 1 h | 默认 |
| T2 | 24 h | 长尾 / 仅监控 |

### 8.2 采集

- **ML**：卖家授权 API 优先；备选合规采集。
- **Amazon MX**：SP-API 优先；Buy Box / min offer 可配置为 anchor 来源。
- 归一化：`effective_competitor_price`（含运费口径 per channel 配置）。
- **Stale**：不参与自动调价，仅告警；冻结 **该通道** 自动调价。

### 8.3 事件

- `CompetitorPriceChanged`（含 channel）
- 去抖（如 5 min 合并）
- 重算 → Guard → Version

### 8.4 动态规则

- 触发：竞品降幅、相对我方 Active 价差等。
- 动作：`suggest` | `auto_pending` | `auto_active`（默认 **Suggest**）。
- 约束：冷却（默认 120 min）、日调价上限（默认 3 次/Listing）、`min_gap`、时间窗。
- 防振荡：median 锚点、跟跌不跟涨（可配）、熔断（回写失败、对账差异）。

### 8.5 分通道默认（可配置）

| 参数 | ML 默认 | Amazon MX 默认 |
|------|---------|----------------|
| anchor | 跟卖 min / 对标 item | buy_box 或 min_competitive |
| offset | match 或 -1% | match |
| Auto 档位 | 品类逐步放量 | 白名单 + 更谨慎 |

---

## 9. Mercado Libre 与 Amazon MX

### 9.1 原则

- 一个 SKU，**每通道最多一个 Listing**。
- **Floor 分通道重算**（共享到岸，不同扣费 → `floor_ml` / `floor_amazon`）。
- 动态调价与 Version **按 channel 独立**；部分成功状态分裂展示。

### 9.2 Listing 标识

| 通道 | 标识 |
|------|------|
| ML | `item_id`、`variation_id`、`permalink` |
| Amazon MX | `ASIN`、Seller SKU、FBA/FBM |

### 9.3 运营界面

双列：ML | Amazon — Active/Suggested、竞品曲线、竞争瀑布、动态规则、模拟与调价单。

---

## 10. 国际化

| 类型 | 策略 |
|------|------|
| UI | zh-CN、en、es-MX；用户级 + 组织默认；fallback en |
| Copilot | 跟随用户语言 |
| 金额 | 引擎/BFF `formatMoney(locale, currency)`；Agent 禁止编造数字 |
| 术语 | 瀑布层、IVA、Buy Box 等术语表 |

---

## 11. 权限与审计

- RBAC：按店铺、通道、品类授权。
- 审批：毛利降幅、绝对降价、Auto 档位变更。
- 审计：Version 不可变；动态调价绑定 `trigger_event_id`、`competitor_snapshot_ids`、`floor_version_id`、`dynamic_rule_id`。
- 导出：PDF/Excel 可选语言。

---

## 12. 非功能需求

| 项 | 要求 |
|----|------|
| 安全 | 渠道密钥与 Agent 隔离；最小权限 |
| 可靠性 | 采集失败 ≠ 降价；队列重试与死信 |
| 性能 | 批量重算异步；按 shop 限流 |
| 合规 | API 优先；爬虫需法务清单 |
| 多租户 | 品牌/店铺隔离；模板可集团共享 |

---

## 13. 分阶段交付路线图

| 阶段 | 名称 | 交付摘要 |
|------|------|----------|
| **P0** | 定价内核 | Web、SKU、成本、费用模板、双模式引擎、瀑布、Version、调价单、i18n 基础、CSV |
| **P1** | 双通道只读 | ML/Amazon 授权、Listing、读价、分通道瀑布与 Floor |
| **P2** | 竞品与 Suggest | 竞品管理、采集 Tier、曲线、事件→Suggested、通知 |
| **P3** | 动态与回写 | Pending/Auto、冷却、ML/Amazon 回写、熔断、对账告警 |
| **P4** | 混合 Agent | Copilot 只读 → 草稿调价单 → NL 编译规则 |
| **P5** | 增强 | 跨通道价差 Guard、指挥中心、Buy Box 策略、报表 |

---

## 14. 待决策项（Open Questions）

1. 标价默认 **含税** 还是 **不含税**（以主通道刊登习惯为准）。
2. 毛利口径：到岸成本 vs 仅 COGS（是否双 KPI）。
3. 促销价：入主瀑布 vs 独立促销瀑布。
4. Amazon Auto 白名单品类与 ML Auto 放量节奏。
5. 无 API 竞品的合规采集范围。

---

## 15. 附录

| 文档 | 说明 |
|------|------|
| [solution-design.md](./solution-design.md) | 方案设计（SDD）v1.0 |
| [test-cases.md](./test-cases.md) | 测试用例 v1.0 |
| [development-task-list.md](./development-task-list.md) | 开发任务清单 |

文档变更记录：v1.0 初版 PRD；配套 SDD / 测试用例 / 任务清单见上表。
