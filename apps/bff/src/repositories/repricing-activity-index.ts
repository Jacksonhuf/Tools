import type { RepricingActivityRepository } from "./repricing-activity-types.js";
import { MemoryRepricingActivityRepository } from "./memory-repricing-activity.js";
import { PostgresRepricingActivityRepository } from "./postgres-repricing-activity.js";

let singleton: RepricingActivityRepository | undefined;

export function createRepricingActivityRepository(): RepricingActivityRepository {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryRepricingActivityRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresRepricingActivityRepository(url);
  }
  return new MemoryRepricingActivityRepository();
}

export function getRepricingActivityRepository(): RepricingActivityRepository {
  if (!singleton) {
    singleton = createRepricingActivityRepository();
  }
  return singleton;
}

export { MemoryRepricingActivityRepository } from "./memory-repricing-activity.js";
export type { RepricingActivityRepository } from "./repricing-activity-types.js";
