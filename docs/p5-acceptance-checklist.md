# P5 验收清单

| ID | 项 | 状态 |
|----|-----|------|
| P5-01 | Cross-channel Guard | 部分（Loop 37：价差 API + UI 横幅） |
| P5-02 | 品类规则模板继承 | 部分（Loop 52：模板 API + 规则合并） |
| P5-03 | 报表导出 | 部分（Loop 38：定价快照 CSV/JSON） |
| P5-04 | 多租户模板共享 | 部分（Loop 54：`shared-fee-templates` API） |
| P5-05 | 批量重算分片 | 部分（Loop 44–51：分片 + worker + 队列 + PG + 租约） |
| P5-06 | ci-nfr-weekly | 部分（Loop 42/55：workflow + timing test） |

已交付相关能力：

- `GET /api/v1/ops/metrics` — 沙箱、适配器、digest / repricing 队列、`nfr` 指标
- `tools/channel-gateway-sidecar` + `npm run dev:channel-gateway`
- `tests/api/channel-gateway-contract.test.ts` — TC-INT-CH-GW-001

详见 [development-backlog-closure.md](./development-backlog-closure.md)。
