# Channel sandbox（Loop 28）

本地与 CI 默认 **沙箱模式**（`CHANNEL_SANDBOX_MODE` 未设或为真）：渠道 OAuth、pull、publish 走 mock 适配器，不写真实 Mercado Libre / Amazon。

## 环境变量

| 变量 | 说明 |
|------|------|
| `CHANNEL_SANDBOX_MODE` | `false` / `0` / `off` 关闭沙箱记录（仍可能使用 mock 适配器，取决于部署） |
| 其他 | 现有 `DIGEST_WEBHOOK_URL`、`RULE_COMPILER_*` 等不变 |

## API

- `GET /api/v1/channels/sandbox/status` — 是否沙箱、允许的操作列表
- `GET /api/v1/channels/sandbox/events?limit=` — 租户内最近沙箱事件（publish、listing_pull）

## 事件类型

- `channel_publish` — 成功 mock 写价后记录价格与 `version_id`
- `listing_pull` — 店铺 listing pull 后记录 snapshot 摘要

## 测试

`tests/api/channel-sandbox.test.ts`；Playwright 调价审批见 `tests/e2e/web/adjustment-approval.spec.ts`（TC-E2E-ADJ-004）。
