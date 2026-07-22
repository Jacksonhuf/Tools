import { describe, expect, it } from "vitest";
import {
  resolveJwtClaimExpectations,
  validateStandardClaims,
} from "../../apps/bff/src/jwt-claims.js";

describe("jwt-claims", () => {
  it("accepts string aud match", () => {
    expect(
      validateStandardClaims(
        { iss: "https://idp.example", aud: "mx-pricing-bff" },
        { issuer: "https://idp.example", audience: "mx-pricing-bff" }
      )
    ).toBe(true);
  });

  it("accepts aud array containing expected audience", () => {
    expect(
      validateStandardClaims(
        { aud: ["other", "mx-pricing-bff"] },
        { issuer: null, audience: "mx-pricing-bff" }
      )
    ).toBe(true);
  });

  it("rejects wrong issuer", () => {
    expect(
      validateStandardClaims(
        { iss: "https://evil.example" },
        { issuer: "https://idp.example", audience: null }
      )
    ).toBe(false);
  });

  it("resolveJwtClaimExpectations prefers OIDC_JWT_ISSUER", () => {
    process.env.OIDC_JWT_ISSUER = "https://jwt-issuer";
    process.env.OIDC_ISSUER_URL = "https://legacy";
    process.env.OIDC_JWT_AUDIENCE = "bff";
    const exp = resolveJwtClaimExpectations();
    expect(exp.issuer).toBe("https://jwt-issuer");
    expect(exp.audience).toBe("bff");
    delete process.env.OIDC_JWT_ISSUER;
    delete process.env.OIDC_ISSUER_URL;
    delete process.env.OIDC_JWT_AUDIENCE;
  });
});
