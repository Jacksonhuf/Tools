# JWT `iss` / `aud` 校验（Loop 47）

当 `AUTH_DRIVER=oidc_jwt` 时，可通过环境变量要求 JWT payload 中的 **issuer** 与 **audience** 与配置一致（签名校验通过后执行）。

## 环境变量

| 变量 | 说明 |
|------|------|
| `OIDC_JWT_ISSUER` | 期望 `iss`（优先于 `OIDC_ISSUER_URL`） |
| `OIDC_ISSUER_URL` | 未设置 `OIDC_JWT_ISSUER` 时作为期望 `iss` |
| `OIDC_JWT_AUDIENCE` | 期望 `aud`（字符串或数组中包含该值） |

未配置某项时，不对该项做强制校验（与 Loop 43–46 行为兼容）。

## 状态

`GET /api/v1/auth/status`（`oidc_jwt`）增加：

- `jwt_issuer_enforced`
- `jwt_audience_enforced`

## 测试

- `tests/unit/jwt-claims.test.ts`
- `tests/api/auth-jwt.test.ts` — TC-API-AUTH-005
