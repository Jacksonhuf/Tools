# P3 回写里程碑验收（Loop 27）

关联：`tests/api/p3-readiness.test.ts`、`tests/e2e/p3-smoke.test.ts`

| 检查项 | 用例 ID | 自动化文件 |
|--------|---------|------------|
| ML/Amazon 渠道写价 mock | TC-INT-CH-003/004 | `channel-publish.test.ts` |
| 批量写价部分成功 | TC-INT-CH-006 | `channel-publish-batch.test.ts` |
| 发布幂等 | TC-INT-CH-007 | `publish-idempotency.test.ts` |
| 渠道对账告警 | TC-INT-RECON-001 | `reconciliation.test.ts` |
| 指挥中心 Promote Pending | TC-E2E-OPS-002 | `repricing-queue.test.ts` |
| Version 审计 | TC-INT-VER-003 | `version-audit.test.ts` |
| 采集失败不降价 | TC-NFR-REL-003 | `ingest-nfr.test.ts` |
| Guard 冷却/日上限 | TC-INT-GUARD | `repricing-guards.test.ts` |
| 营业时间窗 | P3-BUSINESS-HOURS | `business-hours.test.ts` |

**API**：`GET /api/v1/product/readiness` — `p3.ready` 且 `milestones` 中 P3=`accepted`。
