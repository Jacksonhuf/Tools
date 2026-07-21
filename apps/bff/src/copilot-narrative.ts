import type { AppLocale } from "@mx-pricing/i18n-format";

export interface PricingContextNarrativeInput {
  sku?: {
    name?: string;
    sku_code?: string;
    landed_cost?: { formatted?: string };
  };
  versions?: {
    active?: {
      version_id?: string;
      publish_price?: { formatted?: string };
      channel?: string;
    };
  };
  competitors?: {
    anchor?: {
      count?: number;
      median_mxn?: number | null;
      min_mxn?: number | null;
    };
  };
}

export function buildPricingContextNarrative(
  ctx: PricingContextNarrativeInput,
  locale: AppLocale
): string {
  const name = ctx.sku?.name ?? ctx.sku?.sku_code ?? "SKU";
  const landed = ctx.sku?.landed_cost?.formatted ?? "—";
  const active = ctx.versions?.active?.publish_price?.formatted ?? "—";
  const versionId = ctx.versions?.active?.version_id;
  const channel = ctx.versions?.active?.channel ?? "MERCADO_LIBRE";
  const anchor = ctx.competitors?.anchor;
  const compLine =
    anchor && anchor.count && anchor.count > 0
      ? locale === "es-MX"
        ? `Competencia: ${anchor.count} ofertas, mediana ${anchor.median_mxn ?? "—"} MXN.`
        : locale === "zh-CN"
          ? `竞品：${anchor.count} 条报价，中位价 ${anchor.median_mxn ?? "—"} MXN。`
          : `Competitors: ${anchor.count} offers, median ${anchor.median_mxn ?? "—"} MXN.`
      : locale === "es-MX"
        ? "Sin observaciones recientes de competencia."
        : locale === "zh-CN"
          ? "暂无近期竞品观测。"
          : "No recent competitor observations.";

  const versionRef = versionId ? ` [version_id=${versionId}]` : "";

  if (locale === "es-MX") {
    return `Contexto de precios para ${name} (${channel}): costo aterrizado ${landed}; precio activo ${active}${versionRef}. ${compLine}`;
  }
  if (locale === "zh-CN") {
    return `${name}（${channel}）定价上下文：到岸成本 ${landed}；生效价 ${active}${versionRef}。${compLine}`;
  }
  return `Pricing context for ${name} (${channel}): landed ${landed}; active price ${active}${versionRef}. ${compLine}`;
}

export function copilotWelcomeMessage(locale: AppLocale): string {
  if (locale === "es-MX") {
    return "Hola — cargué el contexto de precios desde la herramienta (solo lectura). Puede preguntar por la estrategia o describir una regla.";
  }
  if (locale === "zh-CN") {
    return "你好 — 已通过只读工具加载定价上下文。可询问现状或描述动态规则策略。";
  }
  return "Hello — I loaded read-only pricing context via the agent tool. Ask about the situation or describe a dynamic rule strategy.";
}

export interface SimulateNarrativeInput {
  publish_price_mxn?: number;
  publish_price?: { formatted?: string };
  floor_binding_applied?: boolean;
  guards?: string[];
  channel?: string;
}

export function buildSimulateNarrative(
  input: SimulateNarrativeInput,
  locale: AppLocale,
  competitorPriceMxn: number
): string {
  const price =
    input.publish_price?.formatted ??
    (input.publish_price_mxn != null ? `${input.publish_price_mxn} MXN` : "—");
  const floorNote = input.floor_binding_applied
    ? locale === "es-MX"
      ? " (piso aplicado)"
      : locale === "zh-CN"
        ? "（触发底价）"
        : " (floor binding applied)"
    : "";
  const guards =
    input.guards && input.guards.length > 0
      ? locale === "es-MX"
        ? ` Guardas: ${input.guards.join(", ")}.`
        : locale === "zh-CN"
          ? ` 守卫：${input.guards.join(", ")}。`
          : ` Guards: ${input.guards.join(", ")}.`
      : "";

  if (locale === "es-MX") {
    return `Simulación (tool_simulate): competidor ${competitorPriceMxn} MXN → precio publicable ${price}${floorNote}.${guards}`;
  }
  if (locale === "zh-CN") {
    return `模拟试算（tool_simulate）：竞品价 ${competitorPriceMxn} MXN → 建议标价 ${price}${floorNote}。${guards}`;
  }
  return `Simulation (tool_simulate): competitor ${competitorPriceMxn} MXN → publish price ${price}${floorNote}.${guards}`;
}

export function simulatePriceClarification(locale: AppLocale): string {
  if (locale === "es-MX") {
    return "¿A qué precio de competidor (MXN) desea simular?";
  }
  if (locale === "zh-CN") {
    return "请提供要模拟的竞品价格（MXN）。";
  }
  return "What competitor price (MXN) should I simulate?";
}
