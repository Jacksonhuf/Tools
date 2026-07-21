# P4 Agent 里程碑验收清单（Loop 25）

关联测试：`tests/api/p4-readiness.test.ts`、`tests/e2e/smoke-flow.test.ts`

| 检查项 | 用例 ID | 验证方式 |
|--------|---------|----------|
| Agent 工具目录无 publish/apply | TC-NFR-SEC-004 | `GET /api/v1/agent/readiness` |
| 只读 context / versions / simulate | TC-INT-AGENT-001 | readiness + `agent-tools.test.ts` |
| 草稿调价单工具 | TC-INT-AGENT-002 | readiness + invoke 测试 |
| NL 编译 + 确认入库 | TC-E2E-AGENT-003 | `rule-compiler.test.ts` / smoke-flow |
| 工具调用审计 | TC-INT-AGENT-004 | `agent/tool-audit` |
| 规则编译器就绪 | P4-COMPILER | `GET /api/v1/rule-compiler/status` |
| Digest 队列投递 | P4-DIGEST | `digest-queue.test.ts` |

**API 汇总**：`GET /api/v1/agent/readiness` 返回 `ready: true` 即通过本清单自动化项。

**Webhook 邮件队列**：设置 `DIGEST_WEBHOOK_URL` 后，`webhook_queue` 渠道向该 URL `POST` JSON `{ tenant_id, to, subject, body }`（见 `digest-job-queue.ts`）。

**SMTP 适配器（Loop 26）**：`smtp_queue` 渠道 — `SMTP_SUBMISSION_URL`（HTTP JSON 中继，推荐）或 `SMTP_HOST` + `SMTP_RECORD_STUB=1`（测试 outbox）。见 `smtp-digest-adapter.ts`。

**里程碑**：`GET /api/v1/agent/milestones` — `P4.status=accepted` 表示 P4 自动化验收通过。

**Playwright**：`npm run test:e2e`（`tests/e2e/web/ui-smoke.spec.ts`），CI：`ci-e2e-smoke`。
