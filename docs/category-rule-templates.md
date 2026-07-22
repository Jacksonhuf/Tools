# P5-02 品类规则模板继承（Loop 52）

SKU 通过 `category_id` 关联品类；listing 动态调价规则 GET 时合并品类默认（不覆盖 listing 已显式设置的字段）。

## API

- `GET /api/v1/category-rule-templates`
- `GET /api/v1/category-rule-templates/{categoryId}`
- `GET /api/v1/skus/{skuId}/category-rule-template`
- `GET /api/v1/listings/{listingId}/dynamic-repricing-rule` — 响应含 `category_template_id`

Demo：`demo-sku-001` → `cat-electronics-mx`

## 测试

`tests/api/category-rule-template.test.ts` — TC-API-CAT-001
