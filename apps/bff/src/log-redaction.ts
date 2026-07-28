const SENSITIVE_KEYS =
  /refresh_token|access_token|client_secret|authorization|password|api_key/i;

const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const KEY_VALUE_PATTERN =
  /(refresh_token|access_token|client_secret|api_key)\s*[:=]\s*["']?[^"'\s,}]+/gi;

/** Redact credential-like substrings before writing logs or error surfaces. */
export function sanitizeForLog(input: unknown): string {
  const raw =
    input instanceof Error
      ? input.message
      : typeof input === "string"
        ? input
        : JSON.stringify(input);
  return raw
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(KEY_VALUE_PATTERN, (match) => {
      const key = match.split(/[:=]/)[0]?.trim() ?? "secret";
      return `${key}=[REDACTED]`;
    });
}

export function containsSensitiveCredential(text: string): boolean {
  return SENSITIVE_KEYS.test(text) && !text.includes("[REDACTED]");
}
