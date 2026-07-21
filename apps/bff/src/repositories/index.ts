import type { CatalogRepository } from "./types.js";
import { MemoryCatalogRepository } from "./memory-catalog.js";
import { PostgresCatalogRepository } from "./postgres-catalog.js";

let singleton: CatalogRepository | undefined;

export function createCatalogRepository(): CatalogRepository {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryCatalogRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresCatalogRepository(url);
  }
  return new MemoryCatalogRepository();
}

export function getCatalogRepository(): CatalogRepository {
  if (!singleton) {
    singleton = createCatalogRepository();
  }
  return singleton;
}

export function setCatalogRepository(repo: CatalogRepository): void {
  singleton = repo;
}

export { MemoryCatalogRepository } from "./memory-catalog.js";
export type { CatalogRepository } from "./types.js";
