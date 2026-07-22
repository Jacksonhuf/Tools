# Version 备份演练（X-05）

1. 导出：`GET /api/v1/ops/version-backup?format=download`
2. 或：`POST /api/v1/exports` → 使用返回的 `download_path` 下载
3. 校验：`POST /api/v1/ops/version-backup/validate`，body `{ "snapshot": <JSON> }`

返回 `valid: true` 表示结构可用于灾备演练（本 MVP 不执行写回恢复）。
