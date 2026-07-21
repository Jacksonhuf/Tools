# Auth（Loop 39 / P0-E1-03 占位）

| 变量 | 说明 |
|------|------|
| `AUTH_DRIVER` | `dev`（默认）或 `oidc_stub` |
| `OIDC_ISSUER_URL` | 生产 IdP issuer（占位，未校验 JWT） |

`oidc_stub` 模式除 `dev-token` 外接受 `Authorization: Bearer oidc-stub.<subject>`。

进阶 JWT：`AUTH_DRIVER=oidc_jwt` — 见 [auth-jwt-hs256.md](./auth-jwt-hs256.md)、[auth-jwks-rs256.md](./auth-jwks-rs256.md)。

`GET /api/v1/auth/status`

测试：`tests/api/auth-oidc.test.ts`
