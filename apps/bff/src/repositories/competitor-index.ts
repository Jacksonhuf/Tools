import type { CompetitorRepository } from "./competitor-types.js";
import { MemoryCompetitorRepository } from "./memory-competitor.js";
import { PostgresCompetitorRepository } from "./postgres-competitor.js";

let singleton: CompetitorRepository | undefined;

export function createCompetitorRepository(): CompetitorRepository {
  if (process.env.CATALOG_DRIVER === "memory") {
    return new MemoryCompetitorRepository();
  }
  const url = process.env.DATABASE_URL;
  if (url) {
    return new PostgresCompetitorRepository(url);
  }
  return new MemoryCompetitorRepository();
}

export function getCompetitorRepository(): CompetitorRepository {
  if (!singleton) {
    singleton = createCompetitorRepository();
  }
  return singleton;
}

export { MemoryCompetitorRepository } from "./memory-competitor.js";
export type {
  CompetitorRepository,
  CompetitorOfferRecord,
  PriceObservationRecord,
} from "./competitor-types.js";
