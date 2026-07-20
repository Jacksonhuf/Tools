# 测试用例：墨西哥跨境定价与调价工具

| 属性 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 关联 PRD | [PRD-mexico-cross-border-pricing.md](./PRD-mexico-cross-border-pricing.md) |
| 关联 SDD | [solution-design.md](./solution-design.md) |
| 用例 ID 规则 | `TC-{层级}-{模块}-{序号}` |

**层级**：`UNIT` | `INT` | `API` | `E2E` | `NFR`  
**优先级**：P0 阻断发布 / P1 重要 / P2 一般  

**状态列（执行时填写）**：未执行 | 通过 | 失败 | 阻塞  

---

## 1. 测试策略摘要

| 类型 | 范围 | 工具建议 |
|------|------|----------|
| UNIT | `pricing-engine` 纯函数、Guard、舍入、IVA | 单元测试框架 + 黄金 JSON |
| INT | DB、队列、去抖、Version 不可变 | 测试容器 PostgreSQL/Redis |
| API | BFF 契约、鉴权、错误码 | Contract / Supertest |
| E2E | 关键用户路径、双通道 UI | Playwright |
| NFR | 性能、安全、熔断 | k6、渗透扫描清单 |

黄金用例文件路径（实现任务）：`tests/golden/*.json`，每条注明 `golden_id` 与本文 TC 对应。

---

## 2. 定价引擎 — 到岸成本与成本定价（UNIT）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | golden_id |
|----|--------|------|----------|------|----------|-----------|
| TC-UNIT-COST-001 | P0 | USD 采购折 MXN 含 buffer | fx USD/MXN=20, buffer 2% | 调用 landed 计算，cogs=100 USD | cogs_mxn=2040 | GL-COST-001 |
| TC-UNIT-COST-002 | P0 | 关税计入到岸 | hs duty 5%, cogs_mxn=1000 | 计算 duty | landed 含 50 duty | GL-COST-002 |
| TC-UNIT-COST-003 | P0 | 成本模式正向标价 | target_margin 20%, fee_rate 15% | 正向引擎 | publish 与 Excel 参考一致 | GL-COST-003 |
| TC-UNIT-COST-004 | P1 | 反向目标毛利 | 给定 publish | simulate target_margin | implied margin 误差 &lt; 0.01% | GL-COST-004 |
| TC-UNIT-COST-005 | P0 | IVA 含税标价 | tax_strategy=PRICE_INCLUDES_IVA | 计算 LIST_PRICE 层 | 瀑布 IVA 层与标价关系正确 | GL-COST-005 |
| TC-UNIT-COST-006 | P1 | MXN 舍入 .99 | rounding_rule=END_99 | publish 计算 | 分位符合规则 | GL-COST-006 |
| TC-UNIT-COST-007 | P0 | 负毛利 Guard | min_margin 10%, 输入过低 target | run Guard | `BELOW_MIN_MARGIN`，无 Version | — |

---

## 3. 定价引擎 — 竞争定价与 Floor（UNIT）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | golden_id |
|----|--------|------|----------|------|----------|-----------|
| TC-UNIT-COMP-001 | P0 | match &gt; floor 取 match | match=500, floor=400 | competitive_with_floor | publish=500 | GL-COMP-001 |
| TC-UNIT-COMP-002 | P0 | match &lt; floor 取 floor | match=380, floor=400 | 同上 | publish=400, FLOOR_BINDING 层有原因 | GL-COMP-002 |
| TC-UNIT-COMP-003 | P0 | offset -1% | anchor=1000, offset=-1% | apply_offset | match=990 | GL-COMP-003 |
| TC-UNIT-COMP-004 | P1 | anchor median | 三竞品 100,200,300 | anchor=median | match 基于 200 | GL-COMP-004 |
| TC-UNIT-COMP-005 | P1 | 竞争瀑布层序 | 竞争模式 | build waterfall | 含 COMPETITOR_ANCHOR→MATCH→LIST | — |
| TC-UNIT-COMP-006 | P0 | 跨平台价不进公式 | 传入 Amazon 价在 ML 上下文 | ML channel 计算 | 忽略 Amazon 观测 | GL-COMP-006 |

---

## 4. 分通道 Floor（UNIT / INT）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 | golden_id |
|----|--------|------|----------|------|----------|-----------|
| TC-UNIT-FLOOR-001 | P0 | ML 佣金高于 Amazon 则 floor_ml 更高 | 同 landed，不同 template | 算 floor_ml, floor_amazon | floor_ml &gt; floor_amazon | GL-FLOOR-001 |
| TC-UNIT-FLOOR-002 | P0 | FBA 履约费影响 floor | Amazon FBA 模板 | 仅改 fulfillment | floor 变化符合方向 | GL-FLOOR-002 |
| TC-INT-FLOOR-003 | P1 | Version 记录分 channel floor | listing ML | 创建 version | `floor_price_mxn` 等于引擎 floor_ml | — |

---

## 5. Price Version 与审计（INT / API）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-INT-VER-001 | P0 | Version 不可变 | 已创建 version | 尝试 UPDATE waterfall | 拒绝或仅允许 state 迁移 |
| TC-INT-VER-002 | P0 | active 唯一 | listing 有 active | 新 active 发布 | 旧 active→superseded |
| TC-INT-VER-003 | P0 | 动态调价审计字段 | 事件触发 version | 查 DB | trigger_event_id、snapshot_ids 非空 |
| TC-API-VER-004 | P0 | 获取 pricing-context | 合法 token | GET pricing-context | 含 active/suggested、formatted 金额 |
| TC-API-VER-005 | P1 | simulate 不落库 | — | POST simulate 两次 | 无新 version 行 |

---

## 6. 调价单与审批（API / E2E）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-API-ADJ-001 | P0 | 创建 draft batch | 多 listing | POST batch | status=draft |
| TC-API-ADJ-002 | P0 | 超降幅需审批 | 审批阈值 5% | 降价 10% apply | 阻断或 pending_approval |
| TC-API-ADJ-003 | P0 | approve 后 apply | draft 待批 | approve→apply | 新 active versions |
| TC-E2E-ADJ-004 | P1 | 运营审批 UI 流 | 财务角色登录 | UI 审批 | 状态与 API 一致 |

---

## 7. 竞品采集与观测（INT）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-INT-ING-001 | P0 | ML 观测写入 | mock ML API | 采集任务跑一轮 | price_observations 新增 |
| TC-INT-ING-002 | P0 | Amazon Buy Box 字段 | mock SP-API | 采集 | is_buybox 正确 |
| TC-INT-ING-003 | P0 | effective 含运费开关 | include_shipping=true | 归一化 | effective=sale+shipping |
| TC-INT-ING-004 | P0 | Stale 冻结 | 观测超 threshold | 触发重算 | Guard STALE，不 auto active |
| TC-INT-ING-005 | P1 | Tier T0 调度 | listing tier=T0 | 等待调度 | next_run 间隔符合 15m 级 |

---

## 8. 事件、去抖与动态 Suggest（INT）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-INT-EVT-001 | P0 | 竞品降价触发事件 | 价格变化 | 管道消费 | CompetitorPriceChanged 入队 |
| TC-INT-EVT-002 | P0 | 5min 去抖合并 | 10 次小波动 | 窗口结束 | 重算次数=1 |
| TC-INT-EVT-003 | P0 | 默认 Suggest 不写 Active | action=suggest | 事件处理完 | 新 version state=suggested |
| TC-INT-EVT-004 | P1 | dedupe_key 幂等 | 重复事件 ID | 二次消费 | 无重复 version |

---

## 9. 动态调价 Guard 与熔断（INT / API）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-INT-GUARD-001 | P0 | 冷却期内拒绝 | cooldown 120m，刚调价 | 新事件 | COOLDOWN_ACTIVE |
| TC-INT-GUARD-002 | P0 | 日上限 3 次 | 已调 3 次 | 第 4 次 | DAILY_LIMIT_EXCEEDED |
| TC-INT-GUARD-003 | P1 | min_gap | match 差 1 MXN | 规则 min_gap=5 | 不跟价或抬价 |
| TC-INT-GUARD-004 | P0 | 回写失败熔断 | mock publish fail | 自动 active | rule.frozen=true |
| TC-API-GUARD-005 | P1 | unfreeze API | frozen rule | POST unfreeze | frozen=false |

---

## 10. 通道适配器 — ML / Amazon（INT）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-INT-CH-001 | P0 | ML 读 Listing | 沙箱凭证 | pullListing | 价格字段映射正确 |
| TC-INT-CH-002 | P0 | Amazon 读 Listing | 沙箱 | pullListing | ASIN/SKU/价格 |
| TC-INT-CH-003 | P0 | ML 写价成功 | active version | publishPrice | channel 价一致 |
| TC-INT-CH-004 | P0 | Amazon 写价成功 | 同上 | publishPrice | 成功状态 |
| TC-INT-CH-005 | P1 | 无效步长错误码 | 非法价格 | publish | INVALID_PRICE_STEP，可重试 |
| TC-INT-CH-006 | P0 | 部分成功 | ML 成功 AMZ 失败 | 批量发布 | publish_status 分裂 |

---

## 11. 店铺授权与安全（API / NFR）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-API-AUTH-001 | P0 | 无 token 401 | — | 调 API | 401 |
| TC-API-AUTH-002 | P0 | 跨 tenant 隔离 | tenant A token | 访问 tenant B sku | 403/404 |
| TC-NFR-SEC-003 | P0 | 凭证不明文日志 | 授权失败 | 查日志 | 无 refresh_token |
| TC-NFR-SEC-004 | P0 | Agent 无 publish 工具 | 调 agent 工具列表 | 枚举 | 无 publish/adjust apply |

---

## 12. 国际化（UNIT / E2E）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-UNIT-I18N-001 | P0 | formatMoney es-MX | locale=es-MX, 1234.5 MXN | 格式化 | 符合墨西哥格式 |
| TC-UNIT-I18N-002 | P0 | 语言与币种解耦 | locale=zh-CN, currency=MXN | API 响应 | formatted 中文区域设置下的 MXN |
| TC-E2E-I18N-003 | P1 | 三语切换瀑布层名 | 登录 | 切换 en/es/zh | layer 文案变化，金额不变 |

---

## 13. Agent Copilot（INT / E2E）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-INT-AGENT-001 | P1 | 工具只读 context | 会话 | tool_get_pricing_context | 与 BFF 一致 |
| TC-INT-AGENT-002 | P1 | 草稿调价单 | Copilot 提议 | tool_create_adjustment_draft | batch=draft，未 apply |
| TC-E2E-AGENT-003 | P2 | NL 编译规则确认 | 输入西语策略 | 确认前不入库 | 确认后 rule 生效 |
| TC-INT-AGENT-004 | P0 | 回答金额来自工具 | mock LLM | 审计工具调用 | 每次报价有 tool 记录 |

---

## 14. 对账与指挥中心（E2E / INT）

| ID | 优先级 | 标题 | 前置条件 | 步骤 | 预期结果 |
|----|--------|------|----------|------|----------|
| TC-INT-RECON-001 | P1 | 渠道价不一致告警 | active=100, 渠道=105 | 对账任务 | 告警生成 |
| TC-E2E-OPS-002 | P1 | 竞品变动队列 | 多条 Suggested | 指挥中心批量转 Pending | 批量状态更新 |

---

## 15. 非功能（NFR）

| ID | 优先级 | 标题 | 步骤 | 预期结果 |
|----|--------|------|------|----------|
| TC-NFR-PERF-001 | P1 | pricing-context P95 | 100 并发 GET | P95 &lt; 3s（staging） |
| TC-NFR-PERF-002 | P2 | T0 管道延迟 | 注入变价 | Suggested 产出 &lt; 15min + SLA |
| TC-NFR-REL-003 | P0 | 采集失败不降价 | 采集返回错误 | 无新更低 active |
| TC-NFR-REL-004 | P1 | 队列死信 |  poison message | 进 DLQ，可告警 |

---

## 16. 回归套件与 CI 映射

| CI Job | 包含用例 |
|--------|----------|
| `ci-unit-engine` | TC-UNIT-COST-* , TC-UNIT-COMP-* , TC-UNIT-FLOOR-001/002 , TC-UNIT-I18N-* |
| `ci-int-pricing` | TC-INT-VER-* , TC-INT-GUARD-* , TC-INT-EVT-* |
| `ci-int-channel` | TC-INT-CH-* , TC-INT-ING-*（mock） |
| `ci-api` | TC-API-VER-* , TC-API-ADJ-* , TC-API-AUTH-* |
| `ci-e2e-smoke` | TC-E2E-ADJ-004 , TC-E2E-I18N-003 , 双列瀑布加载 |
| `ci-nfr-weekly` | TC-NFR-PERF-* , TC-NFR-SEC-* |

**P0 发布门禁**：所有 P0 UNIT + INT-VER + INT-GUARD-001/004 + API-AUTH + NFR-REL-003 必须通过。

---

## 17. 黄金用例 JSON 结构（示例）

```json
{
  "golden_id": "GL-COMP-002",
  "tc_ids": ["TC-UNIT-COMP-002"],
  "input": {
    "pricing_mode": "competitive_with_floor",
    "channel": "MERCADO_LIBRE",
    "match_price_mxn": 380,
    "floor_price_mxn": 400
  },
  "expected": {
    "publish_price_mxn": 400,
    "layers": {
      "FLOOR_BINDING": { "reason": "FLOOR_LIFT" }
    }
  }
}
```

---

## 18. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-07-20 | 初版，覆盖 P0–P4 核心场景 |
