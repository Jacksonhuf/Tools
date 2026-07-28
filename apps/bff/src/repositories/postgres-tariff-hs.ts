import { Pool } from "pg";
import type { TariffHsRow, TariffHsRepository } from "./tariff-hs-types.js";

const DEFAULT_ROWS: TariffHsRow[] = [
  {
    hs_code: "HS-ELECTRONICS-MX",
    description: "Electronics (demo)",
    tariff_rate: 0.05,
    customs_fee_mxn: 0,
  },
  {
    hs_code: "8517.12.00",
    description: "Telephones for cellular networks",
    tariff_rate: 0.05,
    customs_fee_mxn: 0,
  },
];

export class PostgresTariffHsRepository implements TariffHsRepository {
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async list(tenantId: string): Promise<TariffHsRow[]> {
    const r = await this.pool.query(
      `SELECT * FROM tariff_rules WHERE tenant_id = $1 ORDER BY hs_code`,
      [tenantId]
    );
    if (r.rowCount === 0) return [...DEFAULT_ROWS];
    return r.rows.map(rowToTariff);
  }

  async get(tenantId: string, hsCode: string) {
    const rows = await this.list(tenantId);
    return rows.find((row) => row.hs_code === hsCode);
  }

  async upsert(tenantId: string, row: TariffHsRow): Promise<TariffHsRow[]> {
    await this.pool.query(
      `INSERT INTO tariff_rules
        (tenant_id, hs_code, duty_rate, notes, description, customs_fee_mxn)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (tenant_id, hs_code) DO UPDATE SET
         duty_rate = EXCLUDED.duty_rate,
         notes = EXCLUDED.notes,
         description = EXCLUDED.description,
         customs_fee_mxn = EXCLUDED.customs_fee_mxn`,
      [
        tenantId,
        row.hs_code,
        row.tariff_rate,
        row.description,
        row.description,
        row.customs_fee_mxn,
      ]
    );
    return this.list(tenantId);
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM tariff_rules`);
  }
}

function rowToTariff(row: Record<string, unknown>): TariffHsRow {
  return {
    hs_code: row.hs_code as string,
    description: (row.description as string) || (row.notes as string) || "",
    tariff_rate: Number(row.duty_rate),
    customs_fee_mxn: Number(row.customs_fee_mxn ?? 0),
  };
}
