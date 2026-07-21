# JWT 认证（Loop 43 / OIDC 进阶）

在 Loop 39 `oidc_stub` 之上，增加 **HS256 JWT** 校验路径。

## 环境变量

| 变量 | 说明 |
|------|------|
| `AUTH_DRIVER` | `oidc_jwt` 或 `jwt` |
| `OIDC_JWT_HS256_SECRET` | HMAC 密钥（与 JWKS 二选一或并存） |
| `OIDC_ISSUER_URL` | 预留 issuer 校验 |

## Token

标准三段式 JWT，`sub` 声明映射为 BFF `authSubject`。`dev-token` 在 `oidc_jwt` 下仍可用。

测试签发：`signHs256Jwt`（`apps/bff/src/oidc-jwt.ts`）。

## RS256 / JWKS

见 [auth-jwks-rs256.md](./auth-jwks-rs256.md)（Loop 46）。

## API

`GET /api/v1/auth/status` — `jwt_hs256_configured`、`jwks_*`、`jwt_rs256_configured`（`oidc_jwt` 时）。

## 测试

`tests/api/auth-jwt.test.ts` — TC-API-AUTH-003
