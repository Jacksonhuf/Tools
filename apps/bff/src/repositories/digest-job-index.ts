import type { DigestJobRepository } from "./digest-job-types.js";
import { MemoryDigestJobRepository } from "./memory-digest-job.js";
import { PostgresDigestJobRepository } from "./postgres-digest-job.js";

let singleton: DigestJobRepository | undefined;

export function createDigestJobRepository(): DigestJobRepository {
  if (process.env.DIGEST_JOB_DRIVER === "memory") {
    return new MemoryDigestJobRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) return new PostgresDigestJobRepository(url);
  return new MemoryDigestJobRepository();
}

export function getDigestJobRepository(): DigestJobRepository {
  if (!singleton) singleton = createDigestJobRepository();
  return singleton;
}

export function setDigestJobRepository(repo: DigestJobRepository): void {
  singleton = repo;
}
