import type { SalesChannel } from "@mx-pricing/channel-adapters";
import type { ShopRepository } from "./repositories/shop-index.js";

const pendingOAuth = new Map<
  string,
  { tenantId: string; shopId: string; channel: SalesChannel; expiresAt: number }
>();

const OAUTH_TTL_MS = 15 * 60 * 1000;

function authorizeUrl(channel: SalesChannel, state: string): string {
  const redirect = encodeURIComponent(
    process.env.OAUTH_REDIRECT_URI ??
      "http://localhost:5173/oauth/callback"
  );
  if (channel === "MERCADO_LIBRE") {
    const clientId = process.env.ML_CLIENT_ID ?? "ML_APP_ID_PLACEHOLDER";
    return `https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&state=${state}`;
  }
  const appId = process.env.AMAZON_LWA_APP_ID ?? "amzn1.sellerapps.app.placeholder";
  return `https://sellercentral.amazon.com.mx/apps/authorize/${appId}?state=${state}&redirect_uri=${redirect}`;
}

export function startOAuth(
  tenantId: string,
  shopId: string,
  channel: SalesChannel
): { state: string; authorization_url: string } {
  const state = `oauth-${shopId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  pendingOAuth.set(state, {
    tenantId,
    shopId,
    channel,
    expiresAt: Date.now() + OAUTH_TTL_MS,
  });
  return { state, authorization_url: authorizeUrl(channel, state) };
}

export async function completeOAuthMock(
  shops: ShopRepository,
  tenantId: string,
  shopId: string,
  state?: string
): Promise<{ shop_id: string; auth_status: string } | { error: string }> {
  if (state) {
    const pending = pendingOAuth.get(state);
    if (!pending || pending.expiresAt < Date.now()) {
      return { error: "INVALID_STATE" };
    }
    if (pending.tenantId !== tenantId || pending.shopId !== shopId) {
      return { error: "SHOP_STATE_MISMATCH" };
    }
    pendingOAuth.delete(state);
  }
  const shop = await shops.getShop(tenantId, shopId);
  if (!shop) {
    return { error: "SHOP_NOT_FOUND" };
  }
  const sellerId =
    shop.channel === "MERCADO_LIBRE"
      ? `ML-${shopId}`
      : `A2${shopId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const expires = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  const updated = await shops.setAuthConnected(tenantId, shopId, {
    external_seller_id: sellerId,
    access_token: `mock-access-${shop.channel}-${Date.now()}`,
    refresh_token: `mock-refresh-${shop.channel}`,
    token_expires_at: expires,
  });
  if (!updated) {
    return { error: "SHOP_NOT_FOUND" };
  }
  return { shop_id: updated.id, auth_status: updated.auth_status };
}

export function shopPublicView(shop: {
  id: string;
  channel: SalesChannel;
  name: string;
  external_seller_id: string | null;
  auth_status: string;
  token_expires_at: string | null;
  created_at: string;
}) {
  return {
    id: shop.id,
    channel: shop.channel,
    name: shop.name,
    external_seller_id: shop.external_seller_id,
    auth_status: shop.auth_status,
    token_expires_at: shop.token_expires_at,
    created_at: shop.created_at,
  };
}
