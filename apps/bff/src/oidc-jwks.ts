import { publicKeyFromJwk } from "./oidc-jwt.js";
import type { KeyObject } from "node:crypto";

export interface JwksDocument {
  keys: Array<Record<string, unknown> & { kid?: string; kty?: string }>;
}

let cachedUrl: string | null = null;
let cachedKeys: Map<string, KeyObject> | null = null;
let cachedAtMs: number | null = null;

export function resolveJwksCacheTtlSec(): number {
  const raw = process.env.OIDC_JWKS_CACHE_TTL_SEC?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 300;
  if (!Number.isFinite(n) || n < 0) return 300;
  return n;
}

export function getJwksCacheStatus() {
  const ttl = resolveJwksCacheTtlSec();
  const url = process.env.OIDC_JWKS_URL?.trim() || null;
  const fresh =
    cachedAtMs != null && Date.now() - cachedAtMs < ttl * 1000;
  return {
    jwks_cache_ttl_sec: ttl,
    jwks_cache_active: Boolean(url && cachedKeys && fresh),
    jwks_cache_fetched_at: cachedAtMs
      ? new Date(cachedAtMs).toISOString()
      : null,
  };
}

export function parseJwksDocument(json: string): Map<string, KeyObject> {
  const doc = JSON.parse(json) as JwksDocument;
  const map = new Map<string, KeyObject>();
  if (!Array.isArray(doc.keys)) return map;
  for (const jwk of doc.keys) {
    if (jwk.kty !== "RSA") continue;
    const kid = typeof jwk.kid === "string" ? jwk.kid : "default";
    try {
      map.set(kid, publicKeyFromJwk(jwk));
    } catch {
      /* skip invalid keys */
    }
  }
  return map;
}

export function getStaticJwksKeys(): Map<string, KeyObject> | null {
  const raw = process.env.OIDC_JWKS_JSON?.trim();
  if (!raw) return null;
  return parseJwksDocument(raw);
}

export async function fetchJwksKeys(url: string): Promise<Map<string, KeyObject>> {
  const ttlMs = resolveJwksCacheTtlSec() * 1000;
  if (
    cachedUrl === url &&
    cachedKeys &&
    cachedAtMs != null &&
    Date.now() - cachedAtMs < ttlMs
  ) {
    return cachedKeys;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`JWKS_FETCH_FAILED:${res.status}`);
  }
  const text = await res.text();
  const keys = parseJwksDocument(text);
  cachedUrl = url;
  cachedKeys = keys;
  cachedAtMs = Date.now();
  return keys;
}

export function resetJwksCacheForTests() {
  cachedUrl = null;
  cachedKeys = null;
  cachedAtMs = null;
}

export async function resolveJwksKey(
  kid: string | undefined
): Promise<KeyObject | null> {
  const staticKeys = getStaticJwksKeys();
  if (staticKeys?.size) {
    if (kid && staticKeys.has(kid)) return staticKeys.get(kid)!;
    if (staticKeys.has("default")) return staticKeys.get("default")!;
    const first = staticKeys.values().next().value;
    return first ?? null;
  }
  const url = process.env.OIDC_JWKS_URL?.trim();
  if (!url) return null;
  const keys = await fetchJwksKeys(url);
  if (kid && keys.has(kid)) return keys.get(kid)!;
  if (keys.has("default")) return keys.get("default")!;
  const first = keys.values().next().value;
  return first ?? null;
}
