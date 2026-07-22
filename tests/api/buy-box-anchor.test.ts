import { describe, expect, it } from "vitest";
import { createTestApp } from "../../apps/bff/src/app.js";

const AUTH = { Authorization: "Bearer dev-token" };
const TENANT = { "X-Tenant-Id": "tenant-demo" };
const JSON_HEADERS = { ...AUTH, ...TENANT, "Content-Type": "application/json" };

describe("TC-API-BUYBOX-001 buy box anchor (P3-E3-03)", () => {
  it("surfaces buy_box_mxn on competitor anchor summary", async () => {
    const { app } = createTestApp();
    const offerRes = await app.request(
      "/api/v1/listings/listing-amz-001/competitors",
      {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          external_ref: "B0-BUYBOX-TEST",
          label: "Buy box rival",
        }),
      }
    );
    expect(offerRes.status).toBe(201);
    const offer = (await offerRes.json()) as { id: string };

    await app.request(`/api/v1/competitor-offers/${offer.id}/observations`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        sale_price: 1425,
        buy_box_winner: true,
      }),
    });

    const list = await app.request(
      "/api/v1/listings/listing-amz-001/competitors",
      { headers: { ...AUTH, ...TENANT } }
    );
    const json = (await list.json()) as {
      anchor: { buy_box_mxn: number | null };
    };
    expect(json.anchor.buy_box_mxn).toBe(1425);
  });
});
