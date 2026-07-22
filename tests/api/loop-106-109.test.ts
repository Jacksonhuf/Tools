import { describe, expect, it, beforeEach } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";
import { resetStoredExportsForTests } from "../../apps/bff/src/export-file-store.js";
import { resetFxRatesForTests } from "../../apps/bff/src/fx-rate-table.js";
import { resetDigestDispatchForTests } from "../../apps/bff/src/agent-digest-dispatch.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("FX rates CSV (Loop 106)", () => {
  beforeEach(() => {
    resetFxRatesForTests();
  });

  it("GET /fx-rates/export includes default USD/MXN", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/fx-rates/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("USD");
    expect(text).toContain("MXN");
  });
});

describe("agent tool audit CSV (Loop 107)", () => {
  beforeEach(() => {
    resetStoredExportsForTests();
  });

  it("GET /agent/tool-audit/export after invoke", async () => {
    const { app } = createTestApp();
    await app.request("/api/v1/agent/tools/invoke", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        tool: "tool_list_price_versions",
        arguments: { sku_id: "demo-sku-001" },
      }),
    });
    const res = await app.request("/api/v1/agent/tool-audit/export", {
      headers: { ...AUTH, ...TENANT },
    });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("tool_name");
  });
});

describe("digest run-due (Loop 108)", () => {
  beforeEach(() => {
    resetDigestDispatchForTests();
  });

  it("POST run-due returns 409 when schedule disabled", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/digest/run-due", {
      method: "POST",
      headers: JSON_HEADERS,
    });
    expect(res.status).toBe(409);
  });

  it("POST run-due?force=true dispatches digest", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/digest/run-due?force=true", {
      method: "POST",
      headers: JSON_HEADERS,
    });
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      job: { job_id: string };
      schedule: { last_dispatch_at: string | null };
    };
    expect(json.job.job_id).toMatch(/^digest-job-/);
    expect(json.schedule.last_dispatch_at).toBeTruthy();
  });

  it("PUT digest schedule rejects invalid cron", async () => {
    const { app } = createTestApp();
    const res = await app.request("/api/v1/agent/digest/schedule", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ cron: "bad" }),
    });
    expect(res.status).toBe(400);
  });
});
