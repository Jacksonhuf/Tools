import { createHmac } from "node:crypto";

/** Keep in sync with apps/bff/src/browser-demo-auth.ts */
const DEMO_SECRET = "mx-pricing-vercel-demo-jwt-secret-replace-me";
const PLACEHOLDERS = new Set(
  ["use-vercel-sensitive-secret", "change-me", "changeme", "please-replace"].map(
    (s) => s.toLowerCase()
  )
);

function base64UrlEncode(data) {
  return Buffer.from(data)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signHs256(payload, secret) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  );
  const signingInput = `${header}.${body}`;
  const sig = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

function isBrowserDemoAuthEnabled() {
  const raw = process.env.BROWSER_DEMO_AUTH?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  return process.env.VERCEL === "1";
}

function resolveSecret() {
  const configured = process.env.OIDC_JWT_HS256_SECRET?.trim();
  if (configured && !PLACEHOLDERS.has(configured.toLowerCase())) {
    return configured;
  }
  if (process.env.VERCEL === "1") {
    return DEMO_SECRET;
  }
  return null;
}

export default {
  fetch(req) {
    if (!isBrowserDemoAuthEnabled()) {
      return new Response("BROWSER_DEMO_AUTH_DISABLED", { status: 404 });
    }
    const secret = resolveSecret();
    if (!secret) {
      return new Response("BROWSER_DEMO_AUTH_MISCONFIGURED", { status: 404 });
    }

    const tenant = req.headers.get("X-Tenant-Id")?.trim() || "tenant-demo";
    const payload = {
      sub: "browser-demo-user",
      tenant_id: tenant,
      roles: [
        "pricing:read",
        "pricing:write",
        "channel:admin",
        "finance:approve",
      ],
    };
    const iss =
      process.env.OIDC_JWT_ISSUER?.trim() ||
      process.env.OIDC_ISSUER_URL?.trim();
    const aud = process.env.OIDC_JWT_AUDIENCE?.trim();
    if (iss) payload.iss = iss;
    if (aud) payload.aud = aud;

    return Response.json({
      access_token: signHs256(payload, secret),
      token_type: "Bearer",
      expires_in: 3600,
    });
  },
};
