import type { AppLocale } from "@mx-pricing/i18n-format";

export type GlossaryCategory = "waterfall_layer" | "tax" | "policy";

export interface GlossaryTerm {
  key: string;
  category: GlossaryCategory;
  labels: Record<AppLocale, string>;
  descriptions: Record<AppLocale, string>;
}

const TERMS: GlossaryTerm[] = [
  {
    key: "LANDED",
    category: "waterfall_layer",
    labels: {
      en: "Landed cost",
      "zh-CN": "落地成本",
      "es-MX": "Costo landed",
    },
    descriptions: {
      en: "COGS + freight + duty allocated to the SKU (SDD §6.2).",
      "zh-CN": "含头程与关税分摊的 SKU 到岸成本（SDD §6.2）。",
      "es-MX": "COGS + flete + arancel asignado al SKU (SDD §6.2).",
    },
  },
  {
    key: "TARGET_PROFIT",
    category: "waterfall_layer",
    labels: {
      en: "Target profit",
      "zh-CN": "目标毛利",
      "es-MX": "Utilidad objetivo",
    },
    descriptions: {
      en: "Margin layer in cost-based pricing mode.",
      "zh-CN": "成本定价模式下的目标毛利层。",
      "es-MX": "Capa de margen en modo costo.",
    },
  },
  {
    key: "MATCH_PRICE",
    category: "waterfall_layer",
    labels: {
      en: "Match competitor",
      "zh-CN": "竞品对齐",
      "es-MX": "Igualar competidor",
    },
    descriptions: {
      en: "Competitive mode anchor vs rival effective price.",
      "zh-CN": "竞争模式下与竞品有效价对齐。",
      "es-MX": "Ancla competitiva vs precio efectivo del rival.",
    },
  },
  {
    key: "FLOOR_BINDING",
    category: "waterfall_layer",
    labels: {
      en: "Floor binding",
      "zh-CN": "底价约束",
      "es-MX": "Piso vinculante",
    },
    descriptions: {
      en: "Channel-specific floor (ML / Amazon) applied as minimum.",
      "zh-CN": "分通道底价（ML / Amazon）作为下限。",
      "es-MX": "Piso por canal (ML / Amazon) como mínimo.",
    },
  },
  {
    key: "LIST_PRICE",
    category: "waterfall_layer",
    labels: {
      en: "List price",
      "zh-CN": "标价",
      "es-MX": "Precio de lista",
    },
    descriptions: {
      en: "Customer-facing publish price before channel fees display.",
      "zh-CN": "对外发布价（展示层）。",
      "es-MX": "Precio publicado al cliente.",
    },
  },
  {
    key: "IVA_DISPLAY",
    category: "waterfall_layer",
    labels: {
      en: "IVA (display)",
      "zh-CN": "IVA（展示）",
      "es-MX": "IVA (visualización)",
    },
    descriptions: {
      en: "Mexican VAT amount when tax strategy includes IVA in list price.",
      "zh-CN": "含税策略下列标价中的墨西哥 IVA 金额。",
      "es-MX": "Monto de IVA cuando el precio incluye impuesto.",
    },
  },
  {
    key: "IVA",
    category: "tax",
    labels: {
      en: "IVA",
      "zh-CN": "增值税 (IVA)",
      "es-MX": "IVA",
    },
    descriptions: {
      en: "Impuesto al Valor Agregado — default 16% in MX fixtures.",
      "zh-CN": "墨西哥增值税，演示默认税率 16%。",
      "es-MX": "Impuesto al Valor Agregado — 16% en fixtures demo.",
    },
  },
  {
    key: "PRICE_INCLUDES_IVA",
    category: "tax",
    labels: {
      en: "Price includes IVA",
      "zh-CN": "含税价",
      "es-MX": "Precio con IVA",
    },
    descriptions: {
      en: "Tax strategy: list price is gross of IVA (TC-UNIT-COST-005).",
      "zh-CN": "税务策略：标价为含税价（TC-UNIT-COST-005）。",
      "es-MX": "Estrategia: precio de lista incluye IVA.",
    },
  },
  {
    key: "PRICE_EXCLUDES_IVA",
    category: "tax",
    labels: {
      en: "Price excludes IVA",
      "zh-CN": "不含税价",
      "es-MX": "Precio sin IVA",
    },
    descriptions: {
      en: "Tax strategy: IVA added on top of net base.",
      "zh-CN": "税务策略：在净价基础上加计 IVA。",
      "es-MX": "Estrategia: IVA se suma sobre base neta.",
    },
  },
  {
    key: "competitive_with_floor",
    category: "policy",
    labels: {
      en: "Competitive with floor",
      "zh-CN": "竞争 + 底价",
      "es-MX": "Competitivo con piso",
    },
    descriptions: {
      en: "Pricing policy: match rivals but never below channel floor.",
      "zh-CN": "定价策略：跟随竞品但不低于通道底价。",
      "es-MX": "Política: igualar rivales sin bajar del piso del canal.",
    },
  },
];

export function listGlossaryTerms(): GlossaryTerm[] {
  return TERMS;
}

export function getGlossaryTerm(key: string): GlossaryTerm | undefined {
  return TERMS.find((t) => t.key === key);
}

export function formatGlossaryForLocale(locale: AppLocale) {
  return TERMS.map((term) => ({
    key: term.key,
    category: term.category,
    label: term.labels[locale],
    description: term.descriptions[locale],
  }));
}

export function resolveGlossaryLabel(
  layerId: string,
  locale: AppLocale
): string {
  const term = getGlossaryTerm(layerId);
  return term?.labels[locale] ?? layerId;
}
