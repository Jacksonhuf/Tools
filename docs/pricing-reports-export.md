# 定价报表导出（Loop 38 / P5-03）

## API

`GET /api/v1/reports/pricing-snapshot`

| 参数 | 说明 |
|------|------|
| `sku_id` | 默认 `demo-sku-001` |
| `format` | `json`（默认）或 `csv` |

CSV 列：`exported_at`, `sku_id`, `sku_code`, `channel`, `active_price_mxn`, `floor_price_mxn`, `landed_cost_mxn`

## Web

指挥中心 **Export pricing CSV**（`data-testid=ops-export-pricing-csv`）。

## 测试

`tests/api/pricing-report.test.ts` — TC-API-RPT-001/002
