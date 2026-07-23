import { describe, expect, it } from "vitest";
import { i18nGlossaryTermToCsv, i18nGlossaryToCsv } from "../../apps/bff/src/i18n-glossary-csv.js";
import { getGlossaryTerm } from "../../apps/bff/src/i18n-glossary.js";
import {
  notificationTemplateToCsv,
  notificationTemplatesToCsv,
} from "../../apps/bff/src/notification-template-csv.js";
import { getNotificationTemplate } from "../../apps/bff/src/notification-templates.js";

describe("i18n glossary CSV (Loop 202-203)", () => {
  it("full glossary CSV includes header", () => {
    const csv = i18nGlossaryToCsv("en", "2026-01-01T00:00:00.000Z");
    expect(csv).toContain("term_key,category,label");
    expect(csv).toContain("LANDED");
  });

  it("single term CSV", () => {
    const term = getGlossaryTerm("IVA");
    expect(term).toBeDefined();
    const csv = i18nGlossaryTermToCsv(term!, "es-MX", "2026-01-01T00:00:00.000Z");
    expect(csv).toContain("IVA");
    expect(csv).toContain("es-MX");
  });
});

describe("notification template CSV (Loop 204-205)", () => {
  it("templates list CSV", () => {
    const csv = notificationTemplatesToCsv("en", "2026-01-01T00:00:00.000Z");
    expect(csv).toContain("template_id,event,channel");
    expect(csv).toContain("CompetitorPriceChanged");
  });

  it("single template CSV", () => {
    const template = getNotificationTemplate("repricing.suggested_pending");
    expect(template).toBeDefined();
    const csv = notificationTemplateToCsv(
      template!,
      "zh-CN",
      "2026-01-01T00:00:00.000Z"
    );
    expect(csv).toContain("repricing.suggested_pending");
    expect(csv).toContain("zh-CN");
  });
});
