import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("i18n glossary API (Loop 202)", () => {
  it("GET /i18n/glossary", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/i18n/glossary", {
      headers: { ...AUTH, ...TENANT, "Accept-Language": "zh-CN" },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { terms: Array<{ key: string }> };
    expect(json.terms.some((t) => t.key === "LANDED")).toBe(true);
  });

  it("GET /i18n/glossary/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/i18n/glossary/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("LANDED");
  });
});

describe("i18n glossary term row CSV (Loop 203)", () => {
  it("GET /i18n/glossary/terms/export?term_key=", async () => {
    const { app } = createTestApp();
    const res = await app.request(
      "/api/v1/i18n/glossary/terms/export?term_key=IVA",
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("IVA");
  });
});

describe("notification templates API (Loop 204)", () => {
  it("GET /notifications/templates", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/notifications/templates", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { templates: Array<{ id: string }> };
    expect(
      json.templates.some((t) => t.id === "repricing.competitor_price_changed")
    ).toBe(true);
  });

  it("GET /notifications/templates/export", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/notifications/templates/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("CompetitorPriceChanged");
  });
});

describe("notification template row CSV (Loop 205)", () => {
  it("GET /notifications/templates/row/export?template_id=", async () => {
    const { app } = createTestApp();
    const id = encodeURIComponent("repricing.competitor_price_changed");
    const res = await app.request(
      `/api/v1/notifications/templates/row/export?template_id=${id}`,
      { headers: { ...AUTH, ...TENANT } }
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("repricing.competitor_price_changed");
  });
});

describe("export store kinds (Loop 202-205)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("POST /exports i18n_glossary_term_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "i18n_glossary_term_csv",
        term_key: "LIST_PRICE",
      }),
    });
    expect(post.status).toBe(200);
  });

  it("POST /exports notification_template_csv", async () => {
    const { app } = createTestApp();
    const post = await app.request("/api/v1/exports", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        kind: "notification_template_csv",
        template_id: "ingest.stale_freeze",
      }),
    });
    expect(post.status).toBe(200);
  });
});
