import type { RepricingRepository } from "./repricing-types.js";
import { MemoryRepricingRepository } from "./memory-repricing.js";
import { PostgresRepricingRepository } from "./postgres-repricing.js";

let singleton: RepricingRepository | undefined;

export function createRepricingRepository(): RepricingRepository {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryRepricingRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresRepricingRepository(url);
  }
  return new MemoryRepricingRepository();
}

export function getRepricingRepository(): RepricingRepository {
  if (!singleton) {
    singleton = createRepricingRepository();
  }
  return singleton;
}

export { MemoryRepricingRepository } from "./memory-repricing.js";
export type { RepricingRepository, RepricingEventRecord } from "./repricing-types.js";
