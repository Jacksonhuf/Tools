# P5 验收清单（占位 — Loop 35）

本 PR（Development Loop 1–36）**未完整实现** P5 Epic，仅交付可观测性与 sidecar 脚手架，供后续迭代。

| ID | 项 | 本 PR 状态 |
|----|-----|------------|
| P5-01 | Cross-channel Guard | 部分（Loop 37：价差 API + UI 横幅） |
| P5-02 | 品类规则模板继承 | 未做 |
| P5-03 | 报表导出 | 部分（Loop 38：定价快照 CSV/JSON） |
| P5-04 | 多租户模板共享 | 部分（`X-Tenant-Id` 隔离） |
| P5-05 | 批量重算分片 | 部分（Loop 44–45：分片 API + worker + tenant 编排） |
| P5-06 | ci-nfr-weekly | 部分（Loop 42：`ci-nfr-weekly.yml`） |

已交付相关能力：

- `GET /api/v1/ops/metrics` — 沙箱事件数、适配器驱动、digest 队列摘要（TC-API-OPS-001）
- `tools/channel-gateway-sidecar` + `npm run dev:channel-gateway`
- `tests/api/channel-gateway-contract.test.ts` — TC-INT-CH-GW-001
