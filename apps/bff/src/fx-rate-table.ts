export type { FxRateRow } from "./repositories/fx-rate-types.js";
import type { FxRateRow } from "./repositories/fx-rate-types.js";
import { getFxRateRepository } from "./repositories/fx-rate-index.js";

export async function listFxRates(tenantId: string): Promise<FxRateRow[]> {
  return getFxRateRepository().list(tenantId);
}

export async function upsertFxRate(
  tenantId: string,
  row: FxRateRow
): Promise<FxRateRow[]> {
  return getFxRateRepository().upsert(tenantId, row);
}

export async function getFxRate(
  tenantId: string,
  base: string,
  quote: string
): Promise<FxRateRow | undefined> {
  return getFxRateRepository().get(tenantId, base, quote);
}

export function resetFxRatesForTests(): void {
  void getFxRateRepository().resetForTests();
}

export function getFxRateStoreStatus() {
  return { driver: getFxRateRepository().driver };
}
