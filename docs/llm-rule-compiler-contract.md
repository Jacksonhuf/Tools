# LLM Rule Compiler HTTP Contract

Production integration for `RULE_COMPILER_DRIVER=llm_http`.

## Endpoint

- **URL**: value of `RULE_COMPILER_LLM_ENDPOINT` (HTTPS POST).
- **Auth** (optional): `Authorization: Bearer <RULE_COMPILER_LLM_API_KEY>` when the key env var is set.

## Request

`Content-Type: application/json`

```json
{
  "natural_language": "Seguir mediana con -3% y auto pending",
  "locale": "es-MX",
  "model": "optional-model-override"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `natural_language` | string | yes | User strategy text (any supported UI language). |
| `locale` | string | yes | `zh-CN`, `en`, or `es-MX` (BFF `Accept-Language`). |
| `model` | string | no | From `RULE_COMPILER_LLM_MODEL` when set. |

## Response

`Content-Type: application/json`, HTTP 2xx.

```json
{
  "explanation": "Human-readable summary in or near the request locale.",
  "draft": {
    "enabled": true,
    "action": "auto_pending",
    "anchor_type": "median",
    "offset": { "type": "PERCENT", "value": -3 },
    "min_gap_mxn": 5,
    "cooldown_min": 0,
    "daily_limit": 10,
    "business_hours_only": false
  }
}
```

### `draft.action`

One of: `suggest`, `pending`, `auto_pending`, `auto_active`.

### `draft.offset`

- `type`: `PERCENT` or `FIXED_MXN`
- `value`: finite number (negative allowed for undercut).

## BFF behavior

- Invalid JSON or schema → **fallback** to keyword heuristic; response `compiler.fallback: true` on compile API.
- Non-2xx HTTP → same fallback.
- Status probe: `GET /api/v1/rule-compiler/status`.

## Example (curl)

```bash
curl -sS -X POST "$RULE_COMPILER_LLM_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RULE_COMPILER_LLM_API_KEY" \
  -d '{"natural_language":"median -2%","locale":"en"}'
```
