import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { resolveDeployEnvironment } from "./deploy-environment.js";

export interface WafStatus {
  enabled: boolean;
  rate_limit_per_minute: number;
  max_body_bytes: number;
  ip_allowlist_count: number;
  ip_blocklist_count: number;
  security_headers: boolean;
}

export interface WafOptions {
  rateLimitPerMinute?: number;
  maxBodyBytes?: number;
  ipAllowlist?: string[];
  ipBlocklist?: string[];
}

const SUSPICIOUS_PATH = /\.\.|\/\/|<script|union\s+select/i;

function parseList(raw?: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function clientIp(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip")?.trim() ||
    "unknown"
  );
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function resetWafBucketsForTests(): void {
  buckets.clear();
}

export function getWafStatus(): WafStatus {
  const enabled = process.env.WAF_ENABLED?.trim().toLowerCase() !== "false";
  return {
    enabled,
    rate_limit_per_minute: Number(process.env.WAF_RATE_LIMIT_PER_MINUTE ?? "300"),
    max_body_bytes: Number(process.env.WAF_MAX_BODY_BYTES ?? "1048576"),
    ip_allowlist_count: parseList(process.env.WAF_IP_ALLOWLIST).length,
    ip_blocklist_count: parseList(process.env.WAF_IP_BLOCKLIST).length,
    security_headers: process.env.WAF_SECURITY_HEADERS?.trim().toLowerCase() !== "false",
  };
}

export function createWafMiddleware(options: WafOptions = {}) {
  const status = getWafStatus();
  const rateLimit =
    options.rateLimitPerMinute ?? status.rate_limit_per_minute;
  const maxBody = options.maxBodyBytes ?? status.max_body_bytes;
  const allowlist = options.ipAllowlist ?? parseList(process.env.WAF_IP_ALLOWLIST);
  const blocklist = options.ipBlocklist ?? parseList(process.env.WAF_IP_BLOCKLIST);
  const deployEnv = resolveDeployEnvironment();
  const wafEnabled =
    status.enabled && (deployEnv === "staging" || deployEnv === "production");

  return async (c: Context, next: Next) => {
    if (!wafEnabled || c.req.path === "/health") {
      await next();
      return;
    }

    if (SUSPICIOUS_PATH.test(c.req.path)) {
      throw new HTTPException(403, { message: "WAF_BLOCKED" });
    }

    const ip = clientIp(c);
    if (blocklist.includes(ip)) {
      throw new HTTPException(403, { message: "WAF_IP_BLOCKED" });
    }
    if (allowlist.length > 0 && !allowlist.includes(ip)) {
      throw new HTTPException(403, { message: "WAF_IP_NOT_ALLOWED" });
    }

    if (!checkRateLimit(ip, rateLimit)) {
      throw new HTTPException(429, { message: "WAF_RATE_LIMITED" });
    }

    const contentLength = Number(c.req.header("content-length") ?? "0");
    if (contentLength > maxBody) {
      throw new HTTPException(413, { message: "WAF_BODY_TOO_LARGE" });
    }

    if (status.security_headers) {
      c.header("X-Content-Type-Options", "nosniff");
      c.header("X-Frame-Options", "DENY");
      c.header("Referrer-Policy", "strict-origin-when-cross-origin");
      c.header("Permissions-Policy", "geolocation=(), microphone=()");
    }

    await next();
  };
}
