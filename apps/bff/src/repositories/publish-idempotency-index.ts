import type { PublishIdempotencyRepository } from "./publish-idempotency-types.js";
import { MemoryPublishIdempotencyRepository } from "./memory-publish-idempotency.js";
import { PostgresPublishIdempotencyRepository } from "./postgres-publish-idempotency.js";

let singleton: PublishIdempotencyRepository | undefined;

export function createPublishIdempotencyRepository(): PublishIdempotencyRepository {
  if (process.env.PUBLISH_IDEMPOTENCY_DRIVER === "memory") {
    return new MemoryPublishIdempotencyRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresPublishIdempotencyRepository(url);
  }
  return new MemoryPublishIdempotencyRepository();
}

export function getPublishIdempotencyRepository(): PublishIdempotencyRepository {
  if (!singleton) {
    singleton = createPublishIdempotencyRepository();
  }
  return singleton;
}

export function setPublishIdempotencyRepository(
  repo: PublishIdempotencyRepository
): void {
  singleton = repo;
}
