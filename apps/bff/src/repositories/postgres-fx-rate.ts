import { Pool } from "pg";
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

export class PostgresFxRateRepository implements FxRateRepository {
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async list(tenantId: string): Promise<FxRateRow[]> {
    const r = await this.pool.query(
      `SELECT * FROM fx_rates WHERE tenant_id = $1 ORDER BY valid_from DESC`,
      [tenantId]
    );
    if (r.rowCount === 0) return [...DEFAULT_RATES];
    return r.rows.map(rowToFx);
  }

  async get(tenantId: string, base: string, quote: string) {
    const rows = await this.list(tenantId);
    return rows.find((row) => row.base === base && row.quote === quote);
  }

  async upsert(tenantId: string, row: FxRateRow): Promise<FxRateRow[]> {
    const id = `fx-${tenantId}-${row.base}-${row.quote}`;
    await this.pool.query(
      `INSERT INTO fx_rates
        (id, tenant_id, base_currency, quote_currency, rate, buffer_pct, valid_from, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         rate = EXCLUDED.rate,
         buffer_pct = EXCLUDED.buffer_pct,
         valid_from = EXCLUDED.valid_from,
         source = EXCLUDED.source`,
      [
        id,
        tenantId,
        row.base,
        row.quote,
        row.rate,
        row.buffer_pct,
        row.effective_from,
        row.source,
      ]
    );
    return this.list(tenantId);
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM fx_rates`);
  }
}

function rowToFx(row: Record<string, unknown>): FxRateRow {
  return {
    base: row.base_currency as string,
    quote: row.quote_currency as string,
    rate: Number(row.rate),
    buffer_pct: Number(row.buffer_pct),
    effective_from: new Date(row.valid_from as string).toISOString(),
    source: row.source as string,
  };
}
