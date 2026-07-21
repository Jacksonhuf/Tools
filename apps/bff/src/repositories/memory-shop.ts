import {
  decryptSecret,
  encryptSecret,
} from "../shop-credential-crypto.js";
import type { ShopAuthStatus, ShopRecord, ShopRepository } from "./shop-types.js";
import type { SalesChannel } from "@mx-pricing/channel-adapters";

let shopSeq = 0;
const shops = new Map<string, ShopRecord>();
const credentials = new Map<
  string,
  { access: string; refresh: string | null }
>();

const DEMO_SHOPS: Array<{
  id: string;
  channel: SalesChannel;
  name: string;
}> = [
  { id: "shop-ml-demo", channel: "MERCADO_LIBRE", name: "Demo ML Shop" },
  { id: "shop-amz-demo", channel: "AMAZON_MX", name: "Demo Amazon MX" },
];

function seedDemo() {
  if (shops.size > 0) return;
  const now = new Date().toISOString();
  for (const s of DEMO_SHOPS) {
    shops.set(s.id, {
      id: s.id,
      tenant_id: "tenant-demo",
      channel: s.channel,
      name: s.name,
      external_seller_id: null,
      auth_status: "disconnected",
      token_expires_at: null,
      created_at: now,
    });
  }
}

export class MemoryShopRepository implements ShopRepository {
  readonly driver = "memory" as const;

  constructor() {
    seedDemo();
  }

  async listShops(tenantId: string): Promise<ShopRecord[]> {
    seedDemo();
    return [...shops.values()].filter((s) => s.tenant_id === tenantId);
  }

  async getShop(
    tenantId: string,
    shopId: string
  ): Promise<ShopRecord | undefined> {
    seedDemo();
    const s = shops.get(shopId);
    if (!s || s.tenant_id !== tenantId) return undefined;
    return s;
  }

  async createShop(input: {
    tenant_id: string;
    channel: SalesChannel;
    name: string;
    external_seller_id?: string;
  }): Promise<ShopRecord> {
    shopSeq += 1;
    const id = `shop-${shopSeq}`;
    const record: ShopRecord = {
      id,
      tenant_id: input.tenant_id,
      channel: input.channel,
      name: input.name,
      external_seller_id: input.external_seller_id ?? null,
      auth_status: "disconnected",
      token_expires_at: null,
      created_at: new Date().toISOString(),
    };
    shops.set(id, record);
    return record;
  }

  async setAuthConnected(
    tenantId: string,
    shopId: string,
    input: {
      external_seller_id: string;
      access_token: string;
      refresh_token?: string;
      token_expires_at: string;
    }
  ): Promise<ShopRecord | undefined> {
    const shop = await this.getShop(tenantId, shopId);
    if (!shop) return undefined;
    const updated: ShopRecord = {
      ...shop,
      external_seller_id: input.external_seller_id,
      auth_status: "connected" satisfies ShopAuthStatus,
      token_expires_at: input.token_expires_at,
    };
    shops.set(shopId, updated);
    credentials.set(shopId, {
      access: encryptSecret(input.access_token),
      refresh: input.refresh_token
        ? encryptSecret(input.refresh_token)
        : null,
    });
    return updated;
  }

  async getAccessToken(shopId: string): Promise<string | undefined> {
    const cred = credentials.get(shopId);
    if (!cred) return undefined;
    return decryptSecret(cred.access);
  }

  resetForTests(): void {
    shops.clear();
    credentials.clear();
    shopSeq = 0;
    seedDemo();
  }
}
