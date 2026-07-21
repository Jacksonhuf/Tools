import type { RepricingAction } from "./repositories/dynamic-rule-types.js";
import type { OffsetJson } from "./repositories/dynamic-rule-types.js";

export interface DynamicRuleDraft {
  enabled: boolean;
  action: RepricingAction;
  anchor_type: string;
  offset: OffsetJson;
  min_gap_mxn: number;
  cooldown_min: number;
  daily_limit: number;
  business_hours_only: boolean;
}

export interface CompiledRuleDraft {
  compile_id: string;
  listing_id: string;
  tenant_id: string;
  source_text: string;
  draft: DynamicRuleDraft;
  explanation: string;
  created_at: string;
}

const pending = new Map<string, CompiledRuleDraft>();
let compileSeq = 0;

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Deterministic mock compiler (no LLM) for TC-E2E-AGENT-003 / local dev. */
export function compileNaturalLanguageToRuleDraft(
  text: string,
  locale: string
): { draft: DynamicRuleDraft; explanation: string } {
  const n = normalize(text);
  let action: RepricingAction = "suggest";
  if (
    n.includes("auto active") ||
    n.includes("activo automatico") ||
    n.includes("自动生效")
  ) {
    action = "auto_active";
  } else if (
    n.includes("auto pending") ||
    n.includes("pendiente") ||
    n.includes("待确认") ||
    n.includes("pending")
  ) {
    action = "auto_pending";
  } else if (n.includes("suggest") || n.includes("sugerir") || n.includes("建议")) {
    action = "suggest";
  }

  let anchor_type = "median";
  if (n.includes("min") || n.includes("minimo") || n.includes("最低")) {
    anchor_type = "min";
  } else if (n.includes("max") || n.includes("maximo") || n.includes("最高")) {
    anchor_type = "max";
  } else if (n.includes("median") || n.includes("mediana") || n.includes("中位")) {
    anchor_type = "median";
  }

  let offset: OffsetJson = { type: "PERCENT", value: 0 };
  const pctMatch = n.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    offset = { type: "PERCENT", value: Number(pctMatch[1]) };
  } else {
    const mxnMatch = n.match(/(-?\d+(?:\.\d+)?)\s*(?:mxn|pesos|比索)/);
    if (mxnMatch) {
      offset = { type: "FIXED_MXN", value: Number(mxnMatch[1]) };
    }
  }

  const gapMatch = n.match(/(?:gap|brecha|间距)\s*(\d+)/);
  const min_gap_mxn = gapMatch ? Number(gapMatch[1]) : 5;

  const business_hours_only =
    n.includes("horario") ||
    n.includes("business hour") ||
    n.includes("营业时间") ||
    n.includes("horas habiles");

  const draft: DynamicRuleDraft = {
    enabled: true,
    action,
    anchor_type,
    offset,
    min_gap_mxn,
    cooldown_min: 0,
    daily_limit: 10,
    business_hours_only,
  };

  const explanation =
    locale === "es-MX"
      ? `Borrador: acción ${action}, ancla ${anchor_type}, offset ${offset.type} ${offset.value}.`
      : locale === "zh-CN"
        ? `草案：动作 ${action}，锚点 ${anchor_type}，偏移 ${offset.type} ${offset.value}。`
        : `Draft: action ${action}, anchor ${anchor_type}, offset ${offset.type} ${offset.value}.`;

  return { draft, explanation };
}

export function storeCompiledDraft(input: {
  tenant_id: string;
  listing_id: string;
  source_text: string;
  draft: DynamicRuleDraft;
  explanation: string;
}): CompiledRuleDraft {
  compileSeq += 1;
  const compile_id = `compile-${compileSeq}`;
  const record: CompiledRuleDraft = {
    compile_id,
    listing_id: input.listing_id,
    tenant_id: input.tenant_id,
    source_text: input.source_text,
    draft: input.draft,
    explanation: input.explanation,
    created_at: new Date().toISOString(),
  };
  pending.set(compile_id, record);
  return record;
}

export function takeCompiledDraft(
  tenantId: string,
  listingId: string,
  compileId: string
): CompiledRuleDraft | undefined {
  const record = pending.get(compileId);
  if (!record) return undefined;
  if (record.tenant_id !== tenantId || record.listing_id !== listingId) {
    return undefined;
  }
  pending.delete(compileId);
  return record;
}

export function peekCompiledDraft(compileId: string): CompiledRuleDraft | undefined {
  return pending.get(compileId);
}

export function resetRuleCompilerForTests(): void {
  pending.clear();
  compileSeq = 0;
}
