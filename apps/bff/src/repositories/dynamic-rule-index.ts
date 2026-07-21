import type {
  DynamicRuleRepository,
  ListingHealthRepository,
} from "./dynamic-rule-types.js";
import { MemoryDynamicRuleRepository } from "./memory-dynamic-rule.js";
import { MemoryListingHealthRepository } from "./memory-listing-health.js";
import {
  PostgresDynamicRuleRepository,
  PostgresListingHealthRepository,
} from "./postgres-dynamic-rule.js";

let ruleSingleton: DynamicRuleRepository | undefined;
let healthSingleton: ListingHealthRepository | undefined;

export function createDynamicRuleRepository(): DynamicRuleRepository {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryDynamicRuleRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresDynamicRuleRepository(url);
  }
  return new MemoryDynamicRuleRepository();
}

export function getDynamicRuleRepository(): DynamicRuleRepository {
  if (!ruleSingleton) {
    ruleSingleton = createDynamicRuleRepository();
  }
  return ruleSingleton;
}

export function createListingHealthRepository(): ListingHealthRepository {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryListingHealthRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresListingHealthRepository(url);
  }
  return new MemoryListingHealthRepository();
}

export function getListingHealthRepository(): ListingHealthRepository {
  if (!healthSingleton) {
    healthSingleton = createListingHealthRepository();
  }
  return healthSingleton;
}

export { MemoryDynamicRuleRepository } from "./memory-dynamic-rule.js";
export { MemoryListingHealthRepository } from "./memory-listing-health.js";
export type {
  DynamicRuleRepository,
  DynamicRuleRecord,
  ListingHealthRepository,
  RepricingAction,
} from "./dynamic-rule-types.js";
