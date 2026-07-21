# Channel HTTP stub adapters（Loop 31）

BFF 默认使用进程内 **mock** 适配器。对接外部渠道网关或 sidecar 时，可切换到 **http_stub** 驱动：向配置的 HTTP 端点 POST JSON，响应格式与 mock 一致。

## 环境变量

| 变量 | 说明 |
|------|------|
| `CHANNEL_ADAPTER_DRIVER` | `mock`（默认）或 `http_stub` / `http` |
| `CHANNEL_HTTP_PUBLISH_URL` | 写价：`POST` JSON `{ channel, shop_id, external_ref, price_mxn }` |
| `CHANNEL_HTTP_LISTING_PULL_URL` | 拉 listing：`POST` JSON `{ channel, shop_id, external_ref }` |

未配置对应 URL 时，**http_stub** 在该操作上回退到 mock（与 `channel-adapter-factory` 状态 API 一致）。

## 响应契约

**Publish**（200 + JSON）：

```json
{ "publish_status": "published", "channel_price_mxn": 1600, "channel": "MERCADO_LIBRE" }
```

或 `{ "publish_status": "failed", "error_code": "CHANNEL_REJECTED" }`

**Listing pull**（200 + JSON）：

```json
{
  "external_item_id": "MLM123",
  "price_mxn": 1599,
  "currency": "MXN",
  "synced_at": "2026-07-21T00:00:00.000Z"
}
```

解析逻辑：`packages/channel-adapters/src/http-response.ts`

## API

- `GET /api/v1/channels/adapters/status` — `driver`、`publish_http_url_configured`、`ready`、`note`

## Web UI（Loop 32）

Channels 页展示 **Channel adapters** 卡片（`data-testid=channel-adapter-status`），含 driver、ready、HTTP 是否配置。Playwright：`channels-sandbox.spec.ts`（TC-E2E-CH-002）。

## 网关联调示例

本地 sidecar（与 `tools/channel-gateway-sidecar/server.mjs` 一致）可监听 `8787`：

```bash
npm run dev:channel-gateway   # CHANNEL_GATEWAY_PORT=8787
```

BFF：

```bash
export CHANNEL_ADAPTER_DRIVER=http_stub
export CHANNEL_HTTP_PUBLISH_URL=http://127.0.0.1:8787/publish
export CHANNEL_HTTP_LISTING_PULL_URL=http://127.0.0.1:8787/pull
```

Publish 请求体示例：

```json
{
  "channel": "MERCADO_LIBRE",
  "shop_id": "shop-ml-demo",
  "external_ref": "listing-ml-001",
  "price_mxn": 1680
}
```

## 测试

- `tests/api/channel-http-adapter.test.ts` — TC-API-CH-HTTP-001
- `tests/api/channel-adapter-status.test.ts`
- `tests/e2e/web/channels-sandbox.spec.ts` — TC-E2E-CH-001/002

生产沙箱切换仍见 [channel-sandbox-production.md](./channel-sandbox-production.md)。
