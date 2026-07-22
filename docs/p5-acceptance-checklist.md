# P5 验收清单

关联：`tests/api/p5-readiness.test.ts`、`GET /api/v1/product/readiness` 之 `p5` 字段

| ID | 项 | 状态 |
|----|-----|------|
| P5-01 | Cross-channel Guard | 验收（`cross-channel-guard.test.ts` + UI） |
| P5-02 | 品类规则模板继承 | 验收（`category-rule-template.test.ts`） |
| P5-03 | 报表导出 | 验收（`pricing-report.test.ts`） |
| P5-04 | 多租户模板共享 | 验收（`shared-fee-templates` + `apply-shared-fee-template`） |
| P5-05 | 批量重算分片 | 验收（shard / queue / PG 存储测试） |
| P5-06 | ci-nfr-weekly | 验收（`pricing-timing.test.ts` + workflow） |

已交付相关能力：

- `GET /api/v1/ops/metrics` — 沙箱、适配器、digest / repricing 队列、`nfr` 指标
- `POST /api/v1/skus/{skuId}/apply-shared-fee-template`
- `tools/channel-gateway-sidecar` + `npm run dev:channel-gateway`
- `tests/api/channel-gateway-contract.test.ts` — TC-INT-CH-GW-001

生产级真实渠道 OAuth / 写价仍见 [development-backlog-closure.md](./development-backlog-closure.md)。
