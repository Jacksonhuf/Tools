import type { ShopRepository } from "./shop-types.js";
import { MemoryShopRepository } from "./memory-shop.js";
import { PostgresShopRepository } from "./postgres-shop.js";

let singleton: ShopRepository | undefined;

export function createShopRepository(): ShopRepository {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryShopRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresShopRepository(url);
  }
  return new MemoryShopRepository();
}

export function getShopRepository(): ShopRepository {
  if (!singleton) {
    singleton = createShopRepository();
  }
  return singleton;
}

export { MemoryShopRepository } from "./memory-shop.js";
export type { ShopRepository, ShopRecord } from "./shop-types.js";
