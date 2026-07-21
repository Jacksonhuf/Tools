# Channel sandbox — production cutover（Loop 30）

本地与预发默认保持 **沙箱**（见 [channel-sandbox.md](./channel-sandbox.md)）。上生产或对接真实 Mercado Libre / Amazon 写价前，按本清单切换。

## 环境变量

| 变量 | 生产建议 | 说明 |
|------|----------|------|
| `CHANNEL_SANDBOX_MODE` | `false` | 关闭沙箱事件账本；`GET .../sandbox/status` 返回 `mode: production` |
| `DATABASE_URL` | 必填 | BFF 启动时 migrate + seed；店铺凭证与调价单落 PostgreSQL |
| `ML_CLIENT_ID` / `ML_CLIENT_SECRET` | 真实应用 | OAuth 与 ML API（当前 BFF 仍以 mock 适配器为主，凭证为后续接线预留） |
| `AMAZON_LWA_APP_ID` / LWA 密钥 | 真实应用 | Amazon MX 授权 |
| `OAUTH_REDIRECT_URI` | HTTPS 回调 | 与渠道开发者控制台一致 |
| `SHOP_CREDENTIAL_ENCRYPTION_KEY` | 32 字节 hex | 加密 `shop_credentials`（见 BFF 启动日志） |

沙箱关闭后：

- Channels UI **不展示**沙箱徽章与事件表（仅 `enabled: true` 时显示）。
- `GET /api/v1/channels/sandbox/events` 仍可用，但 **不会追加** `channel_publish` / `listing_pull` 记录。
- Mock 适配器是否替换为真实 HTTP 适配器取决于部署配置（本仓库默认仍为 mock，避免 CI 外呼）。

## 冒烟（生产模式）

```bash
export CHANNEL_SANDBOX_MODE=false
export DATABASE_URL=postgresql://...
npm run start -w @mx-pricing/bff

curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: tenant-demo" \
  http://localhost:3000/api/v1/channels/sandbox/status | jq .
# 期望: "enabled": false, "mode": "production"
```

回归用例：`tests/api/channel-sandbox.test.ts` 中 **TC-API-SBX-002**。

## 回滚

将 `CHANNEL_SANDBOX_MODE` 设为未设置或 `true`，重启 BFF。事件账本仅进程内存，重启后清空；生产写价行为以渠道适配器与凭证为准。
