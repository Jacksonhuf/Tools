import { publicKeyFromJwk } from "./oidc-jwt.js";
import type { KeyObject } from "node:crypto";

export interface JwksDocument {
  keys: Array<Record<string, unknown> & { kid?: string; kty?: string }>;
}

let cachedUrl: string | null = null;
let cachedKeys: Map<string, KeyObject> | null = null;

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
  if (cachedUrl === url && cachedKeys) {
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
  return keys;
}

export function resetJwksCacheForTests() {
  cachedUrl = null;
  cachedKeys = null;
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
