import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchJwksKeys,
  resetJwksCacheForTests,
  resolveJwksCacheTtlSec,
} from "../../apps/bff/src/oidc-jwks.js";

describe("jwks cache ttl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetJwksCacheForTests();
    delete process.env.OIDC_JWKS_CACHE_TTL_SEC;
  });

  it("refetches after TTL expires", async () => {
    vi.useFakeTimers();
    process.env.OIDC_JWKS_CACHE_TTL_SEC = "60";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      text: async () =>
        JSON.stringify({
          keys: [
            {
              kty: "RSA",
              kid: "k1",
              n: "x",
              e: "AQAB",
            },
          ],
        }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchJwksKeys("https://idp.example/jwks");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await fetchJwksKeys("https://idp.example/jwks");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(61_000);
    await fetchJwksKeys("https://idp.example/jwks");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("defaults TTL to 300 seconds", () => {
    expect(resolveJwksCacheTtlSec()).toBe(300);
  });
});
