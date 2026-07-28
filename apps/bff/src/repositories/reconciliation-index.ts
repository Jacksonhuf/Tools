import type { ReconciliationAlertRepository } from "./reconciliation-types.js";
import { MemoryReconciliationAlertRepository } from "./memory-reconciliation.js";
import { PostgresReconciliationAlertRepository } from "./postgres-reconciliation.js";

let singleton: ReconciliationAlertRepository | undefined;

export function createReconciliationAlertRepository(): ReconciliationAlertRepository {
  if (process.env.RECONCILIATION_DRIVER === "memory") {
    return new MemoryReconciliationAlertRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresReconciliationAlertRepository(url);
  }
  return new MemoryReconciliationAlertRepository();
}

export function getReconciliationAlertRepository(): ReconciliationAlertRepository {
  if (!singleton) {
    singleton = createReconciliationAlertRepository();
  }
  return singleton;
}

export function setReconciliationAlertRepository(
  repo: ReconciliationAlertRepository
): void {
  singleton = repo;
}

export { MemoryReconciliationAlertRepository } from "./memory-reconciliation.js";
export type {
  ReconciliationAlertRecord,
  ReconciliationAlertRepository,
} from "./reconciliation-types.js";
