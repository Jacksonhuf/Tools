import type { ReconciliationAlertRepository } from "./reconciliation-types.js";
import { MemoryReconciliationAlertRepository } from "./memory-reconciliation.js";

let singleton: ReconciliationAlertRepository | undefined;

export function getReconciliationAlertRepository(): ReconciliationAlertRepository {
  if (!singleton) {
    singleton = new MemoryReconciliationAlertRepository();
  }
  return singleton;
}

export { MemoryReconciliationAlertRepository } from "./memory-reconciliation.js";
export type {
  ReconciliationAlertRecord,
  ReconciliationAlertRepository,
} from "./reconciliation-types.js";
