import type { FxRateRow, FxRateRepository } from "./fx-rate-types.js";

const DEFAULT_RATES: FxRateRow[] = [
  {
    base: "USD",
    quote: "MXN",
    rate: 20,
    buffer_pct: 2,
    effective_from: "2026-01-01T00:00:00.000Z",
    source: "demo-table",
  },
];

const byTenant = new Map<string, FxRateRow[]>();

export class MemoryFxRateRepository implements FxRateRepository {
  readonly driver = "memory" as const;

  async list(tenantId: string): Promise<FxRateRow[]> {
    return byTenant.get(tenantId) ?? [...DEFAULT_RATES];
  }

  async get(tenantId: string, base: string, quote: string) {
    const rows = await this.list(tenantId);
    return rows.find((r) => r.base === base && r.quote === quote);
  }

  async upsert(tenantId: string, row: FxRateRow): Promise<FxRateRow[]> {
    const list = [...(await this.list(tenantId))];
    const idx = list.findIndex(
      (r) => r.base === row.base && r.quote === row.quote
    );
    if (idx >= 0) list[idx] = row;
    else list.push(row);
    byTenant.set(tenantId, list);
    return list;
  }

  async resetForTests(): Promise<void> {
    byTenant.clear();
  }
}
