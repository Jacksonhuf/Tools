import { describe, expect, it } from "vitest";
import { sanitizeForLog, containsSensitiveCredential } from "../../apps/bff/src/log-redaction.js";
import { completeOAuthWithCode } from "../../apps/bff/src/channel-oauth-exchange.js";
import { MemoryShopRepository } from "../../apps/bff/src/repositories/memory-shop.js";

describe("TC-NFR-SEC-003 log redaction", () => {
  it("redacts bearer tokens and refresh_token key values", () => {
    const raw =
      'OAuth failed refresh_token=super-secret-refresh-token Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig';
    const sanitized = sanitizeForLog(raw);
    expect(sanitized).not.toContain("super-secret-refresh-token");
    expect(sanitized).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(sanitized).toContain("[REDACTED]");
    expect(containsSensitiveCredential(sanitized)).toBe(false);
  });

  it("OAuth exchange errors do not echo credential literals", async () => {
    const shops = new MemoryShopRepository();
    const tenantId = "tenant-demo";
    const shop = await shops.createShop({
      tenant_id: tenantId,
      channel: "MERCADO_LIBRE",
      name: "Test Shop",
      external_seller_id: "seller-1",
    });
    const prevFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: "invalid_grant",
        refresh_token: "leaked-refresh-token-value",
      }),
    }) as Response;
    try {
      const result = await completeOAuthWithCode(
        shops,
        tenantId,
        shop.id,
        "MERCADO_LIBRE",
        "bad-code"
      );
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).not.toContain("leaked-refresh-token-value");
        expect(result.error).not.toContain("refresh_token=");
      }
    } finally {
      globalThis.fetch = prevFetch;
    }
  });
});
