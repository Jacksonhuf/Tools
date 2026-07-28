import type { CostSheetRepository } from "./cost-sheet-types.js";
import { MemoryCostSheetRepository } from "./memory-cost-sheet.js";
import { PostgresCostSheetRepository } from "./postgres-cost-sheet.js";

let singleton: CostSheetRepository | undefined;

export function createCostSheetRepository(): CostSheetRepository {
  if (process.env.COST_SHEET_DRIVER === "memory") {
    return new MemoryCostSheetRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) return new PostgresCostSheetRepository(url);
  return new MemoryCostSheetRepository();
}

export function getCostSheetRepository(): CostSheetRepository {
  if (!singleton) singleton = createCostSheetRepository();
  return singleton;
}

export function setCostSheetRepository(repo: CostSheetRepository): void {
  singleton = repo;
}
