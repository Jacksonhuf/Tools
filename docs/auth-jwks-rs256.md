# JWKS RS256 JWT（Loop 46）

`AUTH_DRIVER=oidc_jwt` 在配置 **JWKS** 时可校验 **RS256** 签名的 Bearer JWT（与 HS256 密钥路径可并存）。

## 环境变量

| 变量 | 说明 |
|------|------|
| `OIDC_JWKS_JSON` | 内联 JWKS 文档（CI / 本地，优先于 URL） |
| `OIDC_JWKS_URL` | 远程 JWKS 端点（内存缓存，首次请求拉取） |

JWKS 文档需包含 RSA 公钥（`kty: RSA`，`n`/`e`），建议带 `kid` 与 JWT header 一致。

## 校验顺序

1. `dev-token` 仍接受
2. JWT header `alg=HS256` → `OIDC_JWT_HS256_SECRET`
3. JWT header `alg=RS256` → 按 `kid` 从 `OIDC_JWKS_JSON` 或 `OIDC_JWKS_URL` 解析公钥

## 测试

`tests/api/auth-jwt.test.ts` — TC-API-AUTH-004（`generateKeyPairSync` + `OIDC_JWKS_JSON`）

## 未实现

- `iss` / `aud` 强校验
- JWKS 轮换与 TTL 刷新策略
