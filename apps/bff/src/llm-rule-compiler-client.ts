import type { DynamicRuleDraft } from "./rule-compiler.js";
import type { RepricingAction } from "./repositories/dynamic-rule-types.js";
import type { OffsetJson } from "./repositories/dynamic-rule-types.js";

const ACTIONS = new Set<RepricingAction>([
  "suggest",
  "pending",
  "auto_pending",
  "auto_active",
]);

function isOffsetJson(v: unknown): v is OffsetJson {
  if (!v || typeof v !== "object") return false;
  const o = v as OffsetJson;
  return (
    (o.type === "PERCENT" || o.type === "FIXED_MXN") &&
    typeof o.value === "number" &&
    Number.isFinite(o.value)
  );
}

export function parseLlmRuleCompilerResponse(
  json: unknown
): { draft: DynamicRuleDraft; explanation: string } | null {
  if (!json || typeof json !== "object") return null;
  const body = json as {
    draft?: Record<string, unknown>;
    explanation?: string;
  };
  const d = body.draft;
  if (!d || typeof d !== "object") return null;
  const action = d.action as RepricingAction;
  if (!ACTIONS.has(action)) return null;
  if (!isOffsetJson(d.offset)) return null;
  const draft: DynamicRuleDraft = {
    enabled: d.enabled !== false,
    action,
    anchor_type: typeof d.anchor_type === "string" ? d.anchor_type : "median",
    offset: d.offset,
    min_gap_mxn:
      typeof d.min_gap_mxn === "number" ? d.min_gap_mxn : 5,
    cooldown_min: typeof d.cooldown_min === "number" ? d.cooldown_min : 0,
    daily_limit: typeof d.daily_limit === "number" ? d.daily_limit : 10,
    business_hours_only: Boolean(d.business_hours_only),
  };
  const explanation =
    typeof body.explanation === "string" && body.explanation.trim()
      ? body.explanation.trim()
      : "LLM compiler response";
  return { draft, explanation };
}

export async function fetchRuleDraftFromLlmEndpoint(
  natural_language: string,
  locale: string
): Promise<{ draft: DynamicRuleDraft; explanation: string }> {
  const endpoint = process.env.RULE_COMPILER_LLM_ENDPOINT?.trim();
  if (!endpoint) {
    throw new Error("LLM_ENDPOINT_NOT_CONFIGURED");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const apiKey = process.env.RULE_COMPILER_LLM_API_KEY?.trim();
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const model = process.env.RULE_COMPILER_LLM_MODEL?.trim();
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      natural_language,
      locale,
      model: model ?? undefined,
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM_HTTP_${res.status}`);
  }
  const json: unknown = await res.json();
  const parsed = parseLlmRuleCompilerResponse(json);
  if (!parsed) {
    throw new Error("LLM_RESPONSE_INVALID");
  }
  return parsed;
}
