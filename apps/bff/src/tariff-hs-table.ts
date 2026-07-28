export type { TariffHsRow } from "./repositories/tariff-hs-types.js";
import type { TariffHsRow } from "./repositories/tariff-hs-types.js";
import { getTariffHsRepository } from "./repositories/tariff-hs-index.js";

export async function listTariffHsRates(tenantId: string): Promise<TariffHsRow[]> {
  return getTariffHsRepository().list(tenantId);
}

export async function getTariffHsRate(
  tenantId: string,
  hsCode: string
): Promise<TariffHsRow | undefined> {
  return getTariffHsRepository().get(tenantId, hsCode);
}

export async function upsertTariffHsRate(
  tenantId: string,
  row: TariffHsRow
): Promise<TariffHsRow[]> {
  return getTariffHsRepository().upsert(tenantId, row);
}

export function resetTariffHsForTests(): void {
  void getTariffHsRepository().resetForTests();
}

export function getTariffHsStoreStatus() {
  return { driver: getTariffHsRepository().driver };
}
