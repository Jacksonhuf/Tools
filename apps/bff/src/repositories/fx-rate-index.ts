import type { FxRateRepository } from "./fx-rate-types.js";
import { MemoryFxRateRepository } from "./memory-fx-rate.js";
import { PostgresFxRateRepository } from "./postgres-fx-rate.js";

let singleton: FxRateRepository | undefined;

export function createFxRateRepository(): FxRateRepository {
  if (process.env.FX_RATE_DRIVER === "memory") {
    return new MemoryFxRateRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) return new PostgresFxRateRepository(url);
  return new MemoryFxRateRepository();
}

export function getFxRateRepository(): FxRateRepository {
  if (!singleton) singleton = createFxRateRepository();
  return singleton;
}

export function setFxRateRepository(repo: FxRateRepository): void {
  singleton = repo;
}
