import type { SalesChannel } from "@mx-pricing/channel-adapters";

export type ShopAuthStatus = "disconnected" | "connected" | "expired";

export interface ShopRecord {
  id: string;
  tenant_id: string;
  channel: SalesChannel;
  name: string;
  external_seller_id: string | null;
  auth_status: ShopAuthStatus;
  token_expires_at: string | null;
  created_at: string;
}

export interface ShopRepository {
  readonly driver: "memory" | "postgres";
  listShops(tenantId: string): Promise<ShopRecord[]>;
  getShop(tenantId: string, shopId: string): Promise<ShopRecord | undefined>;
  createShop(input: {
    tenant_id: string;
    channel: SalesChannel;
    name: string;
    external_seller_id?: string;
  }): Promise<ShopRecord>;
  setAuthConnected(
    tenantId: string,
    shopId: string,
    input: {
      external_seller_id: string;
      access_token: string;
      refresh_token?: string;
      token_expires_at: string;
    }
  ): Promise<ShopRecord | undefined>;
  getAccessToken(shopId: string): Promise<string | undefined>;
  resetForTests?(): void;
}
