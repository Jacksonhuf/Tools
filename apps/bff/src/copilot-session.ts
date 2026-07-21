import type { AppLocale } from "@mx-pricing/i18n-format";
import type { DynamicRuleDraft } from "./rule-compiler.js";
import { compileRuleViaAdapter } from "./rule-compiler-adapter.js";
import { storeCompiledDraft } from "./rule-compiler.js";
import { isSimulateIntent, parseCompetitorPriceMxn } from "./copilot-intent.js";
import {
  buildSimulateNarrative,
  simulatePriceClarification,
  type SimulateNarrativeInput,
} from "./copilot-narrative.js";
import { invokeAgentTool } from "./agent-tools.js";
import type { CatalogRepository } from "./repositories/index.js";
import type { CompetitorRepository } from "./repositories/competitor-index.js";
import type { AdjustmentRepository } from "./repositories/adjustment-index.js";
import type { AgentToolAuditRepository } from "./repositories/agent-audit-types.js";

export type CopilotTurnDeps = {
  catalog: CatalogRepository;
  competitors: CompetitorRepository;
  adjustments: AdjustmentRepository;
  audit: AgentToolAuditRepository;
};

export type CopilotMessageRole = "user" | "assistant";

export interface CopilotMessage {
  role: CopilotMessageRole;
  content: string;
  created_at: string;
}

export interface CopilotSession {
  session_id: string;
  tenant_id: string;
  listing_id: string | null;
  sku_id: string | null;
  messages: CopilotMessage[];
  last_compile_id: string | null;
  created_at: string;
  updated_at: string;
}

const sessions = new Map<string, CopilotSession>();
let sessionSeq = 0;

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** True when NL mentions competitors but lacks a concrete offset (multi-turn clarify). */
export function needsRuleClarification(text: string): boolean {
  const n = normalize(text);
  const hasOffset =
    /(-?\d+(?:\.\d+)?)\s*%/.test(n) ||
    /(-?\d+(?:\.\d+)?)\s*(?:mxn|pesos|比索)/.test(n);
  if (hasOffset) return false;
  if (/compet|rival|竞品|competidor|rivales/.test(n)) return true;
  return n.trim().length < 8;
}

function clarificationText(locale: AppLocale): string {
  if (locale === "es-MX") {
    return "¿Qué ancla (mediana/mín/máx) y qué offset (% o MXN) desea aplicar frente a competidores?";
  }
  if (locale === "zh-CN") {
    return "请补充锚点（中位/最低/最高）以及相对竞品的偏移（% 或 MXN 比索）。";
  }
  return "Which anchor (median/min/max) and offset (% or MXN) should we apply vs competitors?";
}

function summarizeDraft(locale: AppLocale, draft: DynamicRuleDraft): string {
  if (locale === "es-MX") {
    return `Borrador listo: ${draft.action}, ancla ${draft.anchor_type}, offset ${draft.offset.type} ${draft.offset.value}. Confirme en la sección de regla o use compile_id.`;
  }
  if (locale === "zh-CN") {
    return `草案已就绪：${draft.action}，锚点 ${draft.anchor_type}，偏移 ${draft.offset.type} ${draft.offset.value}。请在规则区确认或使用 compile_id。`;
  }
  return `Draft ready: ${draft.action}, anchor ${draft.anchor_type}, offset ${draft.offset.type} ${draft.offset.value}. Confirm in the rule section or use compile_id.`;
}

export function createCopilotSession(input: {
  tenant_id: string;
  listing_id?: string | null;
  sku_id?: string | null;
}): CopilotSession {
  sessionSeq += 1;
  const session_id = `copilot-${sessionSeq}`;
  const now = new Date().toISOString();
  const session: CopilotSession = {
    session_id,
    tenant_id: input.tenant_id,
    listing_id: input.listing_id ?? null,
    sku_id: input.sku_id ?? null,
    messages: [],
    last_compile_id: null,
    created_at: now,
    updated_at: now,
  };
  sessions.set(session_id, session);
  return session;
}

export function getCopilotSession(
  tenantId: string,
  sessionId: string
): CopilotSession | undefined {
  const s = sessions.get(sessionId);
  if (!s || s.tenant_id !== tenantId) return undefined;
  return s;
}

export function appendCopilotAssistantMessage(
  tenantId: string,
  sessionId: string,
  content: string
): CopilotSession | undefined {
  const session = getCopilotSession(tenantId, sessionId);
  if (!session) return undefined;
  session.messages.push({
    role: "assistant",
    content,
    created_at: new Date().toISOString(),
  });
  session.updated_at = new Date().toISOString();
  return session;
}

function mergedUserText(messages: CopilotMessage[]): string {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join(" ");
}

export async function appendCopilotUserTurn(input: {
  tenant_id: string;
  session_id: string;
  content: string;
  locale: AppLocale;
  listing_id: string;
  sku_id: string;
  channel: "MERCADO_LIBRE" | "AMAZON_MX";
  deps: CopilotTurnDeps;
}): Promise<{
  session: CopilotSession;
  intent: "simulate" | "rule_compile" | "clarify";
  needs_clarification: boolean;
  compile_id?: string;
  draft?: DynamicRuleDraft;
  explanation?: string;
  compiler?: { driver: string; model: string | null; stub: boolean };
}> {
  const session = getCopilotSession(input.tenant_id, input.session_id);
  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }
  const now = new Date().toISOString();
  session.messages.push({
    role: "user",
    content: input.content.trim(),
    created_at: now,
  });
  session.listing_id = input.listing_id;
  session.sku_id = input.sku_id;
  session.updated_at = now;

  if (isSimulateIntent(input.content)) {
    const competitorPrice = parseCompetitorPriceMxn(input.content);
    if (competitorPrice == null || !Number.isFinite(competitorPrice)) {
      const reply = simulatePriceClarification(input.locale);
      session.messages.push({
        role: "assistant",
        content: reply,
        created_at: new Date().toISOString(),
      });
      session.updated_at = new Date().toISOString();
      return { session, intent: "simulate", needs_clarification: true };
    }
    const toolOut = await invokeAgentTool(
      input.deps,
      {
        tenantId: input.tenant_id,
        locale: input.locale,
        sessionId: input.session_id,
      },
      "tool_simulate",
      {
        sku_id: input.sku_id,
        channel: input.channel,
        pricing_mode: "competitive_with_floor",
        competitor_price_mxn: competitorPrice,
      }
    );
    const sim = toolOut.result as SimulateNarrativeInput & {
      publish_price_mxn?: number;
      publish_price?: { formatted?: string };
      floor_binding_applied?: boolean;
      guards?: string[];
      channel?: string;
    };
    const narrative = buildSimulateNarrative(
      sim,
      input.locale,
      competitorPrice
    );
    session.messages.push({
      role: "assistant",
      content: narrative,
      created_at: new Date().toISOString(),
    });
    session.updated_at = new Date().toISOString();
    return { session, intent: "simulate", needs_clarification: false };
  }

  const merged = mergedUserText(session.messages);
  if (needsRuleClarification(merged)) {
    const reply = clarificationText(input.locale);
    session.messages.push({
      role: "assistant",
      content: reply,
      created_at: new Date().toISOString(),
    });
    session.updated_at = new Date().toISOString();
    return { session, intent: "clarify", needs_clarification: true };
  }

  const { draft, explanation, compiler } = await compileRuleViaAdapter(
    merged,
    input.locale
  );
  const compiled = storeCompiledDraft({
    tenant_id: input.tenant_id,
    listing_id: input.listing_id,
    source_text: merged,
    draft,
    explanation,
  });
  session.last_compile_id = compiled.compile_id;
  const assistantContent = `${summarizeDraft(input.locale, draft)}\n${explanation}`;
  session.messages.push({
    role: "assistant",
    content: assistantContent,
    created_at: new Date().toISOString(),
  });
  session.updated_at = new Date().toISOString();

  return {
    session,
    intent: "rule_compile",
    needs_clarification: false,
    compile_id: compiled.compile_id,
    draft,
    explanation,
    compiler,
  };
}

export function resetCopilotSessionsForTests(): void {
  sessions.clear();
  sessionSeq = 0;
}
