import type { TariffHsRepository } from "./tariff-hs-types.js";
import { MemoryTariffHsRepository } from "./memory-tariff-hs.js";
import { PostgresTariffHsRepository } from "./postgres-tariff-hs.js";

let singleton: TariffHsRepository | undefined;

export function createTariffHsRepository(): TariffHsRepository {
  if (process.env.TARIFF_HS_DRIVER === "memory") {
    return new MemoryTariffHsRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) return new PostgresTariffHsRepository(url);
  return new MemoryTariffHsRepository();
}

export function getTariffHsRepository(): TariffHsRepository {
  if (!singleton) singleton = createTariffHsRepository();
  return singleton;
}

export function setTariffHsRepository(repo: TariffHsRepository): void {
  singleton = repo;
}
