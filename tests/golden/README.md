# Golden test fixtures (pricing engine)

与 [docs/test-cases.md](../../docs/test-cases.md) 中的 `GL-*` 编号一一对应，供 `packages/pricing-engine` 单元测试加载。

## 文件约定

| 字段 | 说明 |
|------|------|
| `golden_id` | 唯一 ID，与文件名一致 |
| `tc_ids` | 关联测试用例 |
| `engine` | 调用的引擎入口：`landed_cost` \| `cost_forward` \| `competitive` \| `floor` \| `apply_offset` \| `aggregate_anchor` \| `round_price` \| `guard` |
| `input` | 引擎入参（JSON） |
| `expected` | 断言；数值可用 `tolerance`（相对误差，默认 0） |
| `notes` | 给人看的公式说明 |

## 运行（实现后）

```bash
# 示例：实现 pricing-engine 后
npm test -- --grep golden
```

## 清单

见 [manifest.json](./manifest.json)。
