import {
  createHmac,
  createPublicKey,
  createSign,
  createVerify,
  timingSafeEqual,
  type KeyObject,
} from "node:crypto";

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function base64UrlDecodeJson(segment: string): unknown {
  const padded =
    segment.replace(/-/g, "+").replace(/_/g, "/") +
    "===".slice((segment.length + 3) % 4);
  const json = Buffer.from(padded, "base64").toString("utf8");
  return JSON.parse(json) as unknown;
}

export function decodeJwtSegments(token: string): {
  headerSeg: string;
  payloadSeg: string;
  sigSeg: string;
} | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerSeg, payloadSeg, sigSeg] = parts;
  if (!headerSeg || !payloadSeg || !sigSeg) return null;
  return { headerSeg, payloadSeg, sigSeg };
}

import {
  resolveJwtClaimExpectations,
  validateStandardClaims,
} from "./jwt-claims.js";

function readJwtPayload(
  payloadSeg: string,
  claimExpectations = resolveJwtClaimExpectations()
): { sub: string } | null {
  const payload = base64UrlDecodeJson(payloadSeg) as {
    sub?: string;
    exp?: number;
    iss?: string;
    aud?: string | string[];
  };
  if (!payload.sub || typeof payload.sub !== "string") return null;
  if (payload.exp != null && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  if (!validateStandardClaims(payload, claimExpectations)) return null;
  return { sub: payload.sub };
}

export function signHs256Jwt(
  payload: {
    sub: string;
    exp?: number;
    iss?: string;
    aud?: string | string[];
  },
  secret: string
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: payload.exp ?? Math.floor(Date.now() / 1000) + 3600,
    })
  );
  const signingInput = `${header}.${body}`;
  const sig = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

export function verifyHs256Jwt(
  token: string,
  secret: string
): { sub: string } | null {
  const segments = decodeJwtSegments(token);
  if (!segments) return null;
  const { headerSeg, payloadSeg, sigSeg } = segments;
  const signingInput = `${headerSeg}.${payloadSeg}`;
  const expected = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const actual = Buffer.from(
    sigSeg.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((sigSeg.length + 3) % 4),
    "base64"
  );
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  const header = base64UrlDecodeJson(headerSeg) as { alg?: string };
  if (header.alg !== "HS256") return null;
  const payload = readJwtPayload(payloadSeg);
  if (!payload) return null;
  return { sub: payload.sub };
}

export function signRs256Jwt(
  payload: {
    sub: string;
    exp?: number;
    iss?: string;
    aud?: string | string[];
  },
  privateKey: KeyObject,
  kid = "default"
): string {
  const header = base64UrlEncode(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid })
  );
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: payload.exp ?? Math.floor(Date.now() / 1000) + 3600,
    })
  );
  const signingInput = `${header}.${body}`;
  const sig = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(privateKey);
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

export function verifyRs256Jwt(
  token: string,
  publicKey: KeyObject
): { sub: string } | null {
  const segments = decodeJwtSegments(token);
  if (!segments) return null;
  const { headerSeg, payloadSeg, sigSeg } = segments;
  const header = base64UrlDecodeJson(headerSeg) as { alg?: string };
  if (header.alg !== "RS256") return null;
  const signingInput = `${headerSeg}.${payloadSeg}`;
  const sig = Buffer.from(
    sigSeg.replace(/-/g, "+").replace(/_/g, "/") +
      "===".slice((sigSeg.length + 3) % 4),
    "base64"
  );
  const ok = createVerify("RSA-SHA256")
    .update(signingInput)
    .verify(publicKey, sig);
  if (!ok) return null;
  const payload = readJwtPayload(payloadSeg);
  if (!payload) return null;
  return { sub: payload.sub };
}

export function publicKeyFromJwk(jwk: Record<string, unknown>): KeyObject {
  return createPublicKey({ key: jwk, format: "jwk" });
}
