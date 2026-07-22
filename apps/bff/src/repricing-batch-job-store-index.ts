import type { RepricingBatchJobStore } from "./repositories/repricing-batch-job-store-types.js";
import { MemoryRepricingBatchJobStore } from "./repositories/memory-repricing-batch-job-store.js";
import { PostgresRepricingBatchJobStore } from "./repositories/postgres-repricing-batch-job-store.js";

type StoreGlobal = typeof globalThis & {
  __mxRepricingBatchJobStore?: RepricingBatchJobStore;
};

function getStoreSlot(): RepricingBatchJobStore | undefined {
  return (globalThis as StoreGlobal).__mxRepricingBatchJobStore;
}

function setStoreSlot(store: RepricingBatchJobStore): void {
  (globalThis as StoreGlobal).__mxRepricingBatchJobStore = store;
}

export function resolveRepricingBatchQueueDriver():
  | "memory"
  | "postgres" {
  const raw = (process.env.REPRICING_BATCH_QUEUE_DRIVER ?? "memory")
    .trim()
    .toLowerCase();
  if (raw === "postgres" && process.env.DATABASE_URL?.trim()) {
    return "postgres";
  }
  return "memory";
}

export function getRepricingBatchJobStore(): RepricingBatchJobStore {
  const existing = getStoreSlot();
  if (existing) return existing;

  const driver = resolveRepricingBatchQueueDriver();
  const store =
    driver === "postgres"
      ? new PostgresRepricingBatchJobStore(process.env.DATABASE_URL!)
      : new MemoryRepricingBatchJobStore();
  setStoreSlot(store);
  return store;
}

export function resetRepricingBatchJobQueueForTests(): void {
  setStoreSlot(new MemoryRepricingBatchJobStore());
}
