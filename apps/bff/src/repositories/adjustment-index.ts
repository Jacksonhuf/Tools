import type { AdjustmentRepository } from "./adjustment-types.js";
import { MemoryAdjustmentRepository } from "./memory-adjustment.js";
import { PostgresAdjustmentRepository } from "./postgres-adjustment.js";

let singleton: AdjustmentRepository | undefined;

export function createAdjustmentRepository(): AdjustmentRepository {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryAdjustmentRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresAdjustmentRepository(url);
  }
  return new MemoryAdjustmentRepository();
}

export function getAdjustmentRepository(): AdjustmentRepository {
  if (!singleton) {
    singleton = createAdjustmentRepository();
  }
  return singleton;
}

export { MemoryAdjustmentRepository } from "./memory-adjustment.js";
export type { AdjustmentRepository, AdjustmentBatchRecord } from "./adjustment-types.js";
