import type { SalesChannel } from "@mx-pricing/channel-adapters";
import type { ShopRepository } from "./repositories/shop-index.js";
import { sanitizeForLog } from "./log-redaction.js";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

async function exchangeMercadoLibre(
  code: string
): Promise<TokenResponse> {
  const clientId = process.env.ML_CLIENT_ID?.trim();
  const clientSecret = process.env.ML_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.OAUTH_REDIRECT_URI ?? "http://localhost:5173/oauth/callback";
  if (!clientId || !clientSecret) {
    throw new Error("ML_OAUTH_NOT_CONFIGURED");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error("OAUTH_TOKEN_EXCHANGE_FAILED");
  }
  return (await res.json()) as TokenResponse;
}

async function exchangeAmazonLwa(code: string): Promise<TokenResponse> {
  const clientId = process.env.AMAZON_LWA_APP_ID?.trim();
  const clientSecret = process.env.AMAZON_LWA_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.OAUTH_REDIRECT_URI ?? "http://localhost:5173/oauth/callback";
  if (!clientId || !clientSecret) {
    throw new Error("AMAZON_OAUTH_NOT_CONFIGURED");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error("OAUTH_TOKEN_EXCHANGE_FAILED");
  }
  return (await res.json()) as TokenResponse;
}

export async function completeOAuthWithCode(
  shops: ShopRepository,
  tenantId: string,
  shopId: string,
  channel: SalesChannel,
  code: string,
  state?: string
): Promise<{ shop_id: string; auth_status: string } | { error: string }> {
  const shop = await shops.getShop(tenantId, shopId);
  if (!shop) {
    return { error: "SHOP_NOT_FOUND" };
  }
  if (shop.channel !== channel) {
    return { error: "CHANNEL_MISMATCH" };
  }
  try {
    const tokens =
      channel === "MERCADO_LIBRE"
        ? await exchangeMercadoLibre(code)
        : await exchangeAmazonLwa(code);
    const expires = new Date(
      Date.now() + (tokens.expires_in ?? 3600) * 1000
    ).toISOString();
    const updated = await shops.setAuthConnected(tenantId, shopId, {
      external_seller_id: shop.external_seller_id ?? shopId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? "",
      token_expires_at: expires,
    });
    if (!updated) {
      return { error: "SHOP_NOT_FOUND" };
    }
    return { shop_id: updated.id, auth_status: updated.auth_status };
  } catch (e) {
    const msg = sanitizeForLog(e);
    return { error: msg.includes("OAUTH") ? msg : "OAUTH_FAILED" };
  }
}
