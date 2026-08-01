# Vercel 演示环境配置指南（中文）

适用于 **https://tools-bff.vercel.app** 这类「演示 / 试用」部署：API 在 Vercel Serverless 上运行，数据默认在内存中，**不需要**自建 Postgres。

## 一、打开环境变量页面

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入项目 **tools-bff**（或你绑定的 GitHub 仓库对应项目）
3. 顶部 **Settings** → 左侧 **Environment Variables**
4. 环境选择 **Production**（预览环境可选 Preview，步骤相同）

## 二、必填变量（解决 401）

**演示环境（Vercel 内存模式）可零配置**：不设置任何环境变量也能部署运行，系统会自动使用内置演示 JWT 密钥。  
若你要自定义，或接真实生产，再按下表添加（密钥类请勾选 **Sensitive**）。

| 变量名 | 示例值 | 说明 |
|--------|--------|------|
| `AUTH_DRIVER` | `oidc_jwt` | 生产认证模式 |
| `OIDC_JWT_HS256_SECRET` | 见下方生成命令 | **最重要**：用于签发浏览器 JWT |
| `BROWSER_DEMO_AUTH` | `1` | 允许 SPA 自动获取演示 Token |
| `CORS_ALLOWED_ORIGINS` | `https://tools-bff.vercel.app` | 改成你的实际域名 |

### 生成随机密钥（在本地终端执行）

```bash
# JWT 签名密钥（复制输出整行到 OIDC_JWT_HS256_SECRET）
openssl rand -hex 32

# 店铺凭证加密密钥（复制到 SHOP_CREDENTIAL_ENCRYPTION_KEY）
openssl rand -hex 16
```

### 建议一并添加

| 变量名 | 值 |
|--------|-----|
| `DEPLOY_ENV` | `production` |
| `NODE_ENV` | `production` |
| `PRODUCTION_MODE` | `true` |
| `SHOP_CREDENTIAL_ENCRYPTION_KEY` | `openssl rand -hex 16` 的输出 |

## 三、不要设置的变量（演示模式）

以下变量若已存在，请**删除**或确保未启用，否则会走真实数据库或关闭演示登录：

| 变量 | 说明 |
|------|------|
| `VERCEL_USE_PG=1` | 会关闭内存模式，并可能关闭浏览器演示 Token |
| `DATABASE_URL` | 演示模式不需要（除非你要接真实库） |

完整生产清单见 [config/vercel.env.production.example](../config/vercel.env.production.example)。  
**演示最小清单**见 [config/vercel.env.demo.example](../config/vercel.env.demo.example)。

## 四、保存并重新部署

1. 每添加一个变量点 **Save**
2. 进入 **Deployments** 标签
3. 最新一条部署右侧 **⋯** → **Redeploy**（勾选 Use existing Build Cache 即可）
4. 等待约 1–2 分钟

## 五、验证是否配置成功

在终端执行（把域名换成你的）：

```bash
# 1. 健康检查 — 应返回 {"ok":true,...}
curl -sS https://tools-bff.vercel.app/api/v1/ping

# 2. 浏览器 Token — 应返回 JSON，含 access_token（不是 404）
curl -sS https://tools-bff.vercel.app/api/v1/browser-token \
  -H "X-Tenant-Id: tenant-demo"

# 3. 用 Token 调 API — 应返回 200 JSON（不是 401）
TOKEN=$(curl -sS https://tools-bff.vercel.app/api/v1/browser-token \
  -H "X-Tenant-Id: tenant-demo" | jq -r .access_token)
curl -sS https://tools-bff.vercel.app/api/v1/channels/adapters/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: tenant-demo"
```

浏览器：强制刷新页面（Ctrl+Shift+R），Channels 等页面不应再出现 `adapter status 401`。

## 六、常见问题

| 现象 | 处理 |
|------|------|
| `browser-token` 返回 `BROWSER_DEMO_AUTH_DISABLED` | 确认未设置 `BROWSER_DEMO_AUTH=0`；Vercel 演示部署默认已开启，无需额外变量 |
| 页面仍 401 | 环境变量改完后是否 **Redeploy**；浏览器清缓存 |
| `OIDC_JWT_HS256_SECRET` 填什么 | 任意足够长的随机串，用 `openssl rand -hex 32` 生成即可 |

## 七、我无法代你操作的部分

Cloud Agent **没有**你的 Vercel 账号权限，无法直接在 Dashboard 里替你点保存。请按上文自行添加变量；若你把 Vercel Team 邀请给维护者并自行配置 `VERCEL_TOKEN`，才可通过 CLI 批量导入。

相关英文文档：[vercel-production-deploy.md](./vercel-production-deploy.md)
