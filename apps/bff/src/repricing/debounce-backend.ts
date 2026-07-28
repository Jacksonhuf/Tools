import type { DebounceBackend } from "./debounce-memory.js";
import { MemoryDebounceBackend } from "./debounce-memory.js";
import { RedisDebounceBackend } from "./debounce-redis.js";

let singleton: DebounceBackend | undefined;

export function resolveDebounceDriver(): "memory" | "redis" {
  const raw = (process.env.REPRICING_DEBOUNCE_DRIVER ?? "").trim().toLowerCase();
  if (raw === "redis" && process.env.REDIS_URL?.trim()) {
    return "redis";
  }
  if (process.env.REDIS_URL?.trim() && raw !== "memory") {
    return "redis";
  }
  return "memory";
}

export function getDebounceBackend(): DebounceBackend {
  if (!singleton) {
    singleton =
      resolveDebounceDriver() === "redis"
        ? new RedisDebounceBackend()
        : new MemoryDebounceBackend();
  }
  return singleton;
}

export function setDebounceBackend(backend: DebounceBackend): void {
  singleton = backend;
}

export type {
  CompetitorPriceChangedPayload,
  DebounceRecordInput,
} from "./debounce-memory.js";
