import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetDebounceForTests } from "../../apps/bff/src/repricing/debounce.js";
import { getNotificationInboxRepository } from "../../apps/bff/src/repositories/notification-inbox-index.js";
import { renderNotificationTemplate } from "../../apps/bff/src/notification-template-render.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

function recentIso(minutesAgo = 1): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

describe("notification template render", () => {
  it("replaces variables", () => {
    expect(
      renderNotificationTemplate("Hello {{name}} — {{missing}}", {
        name: "MX",
        missing: null,
      })
    ).toBe("Hello MX — ");
  });
});

describe("P2-E3-05 notification inbox", () => {
  beforeEach(() => {
    resetDebounceForTests();
    getNotificationInboxRepository().resetForTests?.();
    const t = createTestApp();
    t.competitors.resetForTests?.();
    t.repricing.resetForTests?.();
    t.dynamicRules.resetForTests?.();
    t.listingHealth.resetForTests?.();
    t.repricingActivity.resetForTests?.();
    t.catalog.resetForTests?.();
  });

  it("GET /notifications/inbox returns items after repricing process", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/listings/listing-ml-001/price-versions", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ explicit_price_mxn: 1600 }),
    });
    const create = await app.request(
      "/api/v1/listings/listing-ml-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ external_ref: "MLM-NOTIF" }),
      }
    );
    const offer = (await create.json()) as { id: string };
    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ sale_price: 1400, observed_at: recentIso(1) }),
    });
    const flush = await app.request(
      "/api/v1/listings/listing-ml-001/repricing-events/flush",
      { method: "POST", headers: JSON_HEADERS }
    );
    const { event } = (await flush.json()) as { event: { id: string } };
    const process = await app.request(
      `/api/v1/repricing-events/${event.id}/process`,
      {
        method: "POST",
        headers: { ...AUTH, ...TENANT, "Accept-Language": "zh-CN" },
      }
    );
    expect(process.status).toBe(200);

    const inbox = await app.request("/api/v1/notifications/inbox", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(inbox.status).toBe(200);
    const json = (await inbox.json()) as {
      items: Array<{ template_id: string; subject: string; read_at: string | null }>;
    };
    expect(json.items.length).toBeGreaterThan(0);
    expect(
      json.items.some((n) => n.template_id === "repricing.competitor_price_changed")
    ).toBe(true);
    expect(json.items[0].subject).toContain("竞品");

    const mark = await app.request(
      `/api/v1/notifications/${json.items[0].id}/read`,
      { method: "POST", headers: JSON_HEADERS }
    );
    expect(mark.status).toBe(200);
    const marked = (await mark.json()) as { notification: { read_at: string } };
    expect(marked.notification.read_at).toBeTruthy();
  });

  it("GET /notifications/inbox/export returns CSV", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/notifications/inbox/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("template_id");
  });
});
