# Development backlog 收官（Loops 50–56）

在 **Loop 1–49** 与 PR #1–#11 已合入 `main` 的基础上，本批交付剩余 **P5 / X-01 / Auth** 文档化 backlog 的可运行实现（非生产全量渠道对接）。

| Loop | 主题 | 状态 |
|------|------|------|
| 50 | JWKS 缓存 TTL（`OIDC_JWKS_CACHE_TTL_SEC`） | 本批 |
| 51 | Repricing batch job 租约（PG `011` + `X-Repricing-Worker-Id`） | 本批 |
| 52 | P5-02 品类规则模板继承 API + 动态规则合并 | 本批 |
| 53 | X-01 `ops/metrics.nfr` 定价/重算指标 | 本批 |
| 54 | P5-04 租户共享费率模板 API | 本批 |
| 55 | P5-06 NFR 周检 timing scaffold | 本批 |
| 56 | 渠道 live 确认位 `CHANNEL_LIVE_ACKNOWLEDGED` | 本批 |

## 仍未声称「生产完成」的项

- 真实 Mercado Libre / Amazon **生产** OAuth 与写价 API（仍为 mock / http_stub）
- P0–P4 任务清单中大量 Story 的「部分」状态（需按业务优先级继续 Epic）
- 多区域 HA、安全扫描 X-03、备份演练 X-05

后续工作请按 [development-task-list.md](./development-task-list.md) 新开 Epic PR，而非固定 Loop 编号。

门禁：`npm ci && npm run build && npm test && npm run test:smoke`
