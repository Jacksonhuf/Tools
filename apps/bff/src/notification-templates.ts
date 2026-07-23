import type { AppLocale } from "@mx-pricing/i18n-format";

export type NotificationChannel = "email" | "in_app";

export interface NotificationTemplate {
  id: string;
  event: string;
  channel: NotificationChannel;
  subject: Record<AppLocale, string>;
  body: Record<AppLocale, string>;
}

const TEMPLATES: NotificationTemplate[] = [
  {
    id: "repricing.competitor_price_changed",
    event: "CompetitorPriceChanged",
    channel: "in_app",
    subject: {
      en: "Competitor price changed",
      "zh-CN": "竞品价格变动",
      "es-MX": "Cambio de precio del competidor",
    },
    body: {
      en: "Listing {{listing_id}}: rival {{external_ref}} now {{sale_price_mxn}} MXN. Suggested version {{version_id}}.",
      "zh-CN":
        "Listing {{listing_id}}：竞品 {{external_ref}} 现价 {{sale_price_mxn}} MXN。建议版本 {{version_id}}。",
      "es-MX":
        "Listing {{listing_id}}: rival {{external_ref}} ahora {{sale_price_mxn}} MXN. Versión sugerida {{version_id}}.",
    },
  },
  {
    id: "repricing.suggested_pending",
    event: "SuggestedPricePending",
    channel: "in_app",
    subject: {
      en: "Suggested price pending approval",
      "zh-CN": "建议价待审批",
      "es-MX": "Precio sugerido pendiente",
    },
    body: {
      en: "SKU {{sku_id}} on {{channel}} needs operator review (action {{rule_action}}).",
      "zh-CN": "SKU {{sku_id}}（{{channel}}）需运营确认（动作 {{rule_action}}）。",
      "es-MX":
        "SKU {{sku_id}} en {{channel}} requiere revisión (acción {{rule_action}}).",
    },
  },
  {
    id: "channel.publish_partial",
    event: "ChannelPublishPartial",
    channel: "email",
    subject: {
      en: "Channel publish partial success",
      "zh-CN": "渠道写价部分成功",
      "es-MX": "Publicación parcial en canal",
    },
    body: {
      en: "Batch {{batch_id}}: {{success_count}} ok, {{failure_count}} failed. See publish_status in ops center.",
      "zh-CN":
        "批次 {{batch_id}}：成功 {{success_count}}，失败 {{failure_count}}。详见指挥中心 publish_status。",
      "es-MX":
        "Lote {{batch_id}}: {{success_count}} ok, {{failure_count}} fallos. Ver publish_status en ops.",
    },
  },
  {
    id: "ingest.stale_freeze",
    event: "IngestStaleFreeze",
    channel: "in_app",
    subject: {
      en: "Listing frozen — stale ingest",
      "zh-CN": "Listing 已冻结（采集过期）",
      "es-MX": "Listing congelado — ingest obsoleto",
    },
    body: {
      en: "Listing {{listing_id}} ingest stale since {{stale_since}}. Dynamic rule frozen; unfreeze when fresh.",
      "zh-CN":
        "Listing {{listing_id}} 自 {{stale_since}} 采集过期，动态规则已冻结；刷新后可解冻。",
      "es-MX":
        "Listing {{listing_id}} obsoleto desde {{stale_since}}. Regla congelada; descongelar al actualizar.",
    },
  },
];

export function listNotificationTemplates(): NotificationTemplate[] {
  return TEMPLATES;
}

export function getNotificationTemplate(
  templateId: string
): NotificationTemplate | undefined {
  return TEMPLATES.find((t) => t.id === templateId);
}

export function formatNotificationTemplatesForLocale(locale: AppLocale) {
  return TEMPLATES.map((t) => ({
    id: t.id,
    event: t.event,
    channel: t.channel,
    subject: t.subject[locale],
    body: t.body[locale],
  }));
}
