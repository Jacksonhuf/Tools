import type { DebounceBackend, DebounceRecordInput } from "./debounce-memory.js";
import { MemoryDebounceBackend } from "./debounce-memory.js";

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

let client: RedisClient | null | undefined;

async function getRedisClient(): Promise<RedisClient | null> {
  if (client !== undefined) return client;
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    client = null;
    return client;
  }
  try {
    const mod = await import("redis");
    const created = mod.createClient({ url });
    created.on("error", (err: Error) => {
      console.error("Redis debounce client error", err.message);
    });
    if (!created.isOpen) {
      await created.connect();
    }
    client = created as unknown as RedisClient;
    return client;
  } catch (e) {
    console.error("Redis debounce unavailable, falling back to memory", e);
    client = null;
    return client;
  }
}

function debounceMs(): number {
  const raw = process.env.REPRICING_DEBOUNCE_MS;
  if (raw !== undefined) return Number(raw);
  return 5 * 60 * 1000;
}

function key(listingId: string): string {
  return `mx:debounce:${listingId}`;
}

export class RedisDebounceBackend implements DebounceBackend {
  readonly driver = "redis" as const;
  private readonly fallback = new MemoryDebounceBackend();

  async record(input: DebounceRecordInput): Promise<void> {
    const redis = await getRedisClient();
    if (!redis) {
      return this.fallback.record(input);
    }
    const ms = debounceMs();
    const ttlSec = Math.max(1, Math.ceil(ms / 1000));
    const existingRaw = await redis.get(key(input.listing_id));
    const now = Date.now();
    let entry: {
      listing_id: string;
      channel: string;
      offer_id: string;
      first_previous: number | null;
      last_current: number;
      last_observation_id: string;
      last_observed_at: string;
      tick_count: number;
      expires_at: number;
    };
    if (existingRaw) {
      const parsed = JSON.parse(existingRaw) as typeof entry;
      if (parsed.expires_at > now) {
        entry = {
          ...parsed,
          tick_count: parsed.tick_count + 1,
          last_current: input.current_effective,
          last_observation_id: input.observation_id,
          last_observed_at: input.observed_at,
          offer_id: input.offer_id,
          expires_at: now + ms,
        };
      } else {
        entry = {
          listing_id: input.listing_id,
          channel: input.channel,
          offer_id: input.offer_id,
          first_previous: input.previous_effective,
          last_current: input.current_effective,
          last_observation_id: input.observation_id,
          last_observed_at: input.observed_at,
          tick_count: 1,
          expires_at: now + ms,
        };
      }
    } else {
      entry = {
        listing_id: input.listing_id,
        channel: input.channel,
        offer_id: input.offer_id,
        first_previous: input.previous_effective,
        last_current: input.current_effective,
        last_observation_id: input.observation_id,
        last_observed_at: input.observed_at,
        tick_count: 1,
        expires_at: now + ms,
      };
    }
    await redis.set(key(input.listing_id), JSON.stringify(entry), { EX: ttlSec });
  }

  async flush(listingId: string) {
    const redis = await getRedisClient();
    if (!redis) {
      return this.fallback.flush(listingId);
    }
    const raw = await redis.get(key(listingId));
    if (!raw) return null;
    await redis.del(key(listingId));
    const entry = JSON.parse(raw) as {
      listing_id: string;
      channel: string;
      offer_id: string;
      first_previous: number | null;
      last_current: number;
      last_observation_id: string;
      last_observed_at: string;
      tick_count: number;
    };
    return {
      listing_id: entry.listing_id,
      channel: entry.channel as DebounceRecordInput["channel"],
      offer_id: entry.offer_id,
      previous_effective: entry.first_previous,
      current_effective: entry.last_current,
      observed_at: entry.last_observed_at,
      observation_id: entry.last_observation_id,
      debounce_ticks: entry.tick_count,
    };
  }

  async resetForTests(): Promise<void> {
    await this.fallback.resetForTests();
  }
}
