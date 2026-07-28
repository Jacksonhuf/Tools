import { Pool } from "pg";
import type { CostSheetRecord } from "../cost-sheet-types.js";
import type { CostSheetRepository } from "./cost-sheet-types.js";

let seq = 0;

export class PostgresCostSheetRepository implements CostSheetRepository {
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async list(tenantId: string, skuId: string): Promise<CostSheetRecord[]> {
    const r = await this.pool.query(
      `SELECT * FROM cost_sheets
       WHERE tenant_id = $1 AND sku_id = $2
       ORDER BY effective_from DESC`,
      [tenantId, skuId]
    );
    return r.rows.map(rowToCostSheet);
  }

  async get(
    tenantId: string,
    skuId: string,
    sheetId: string
  ): Promise<CostSheetRecord | undefined> {
    const r = await this.pool.query(
      `SELECT * FROM cost_sheets WHERE tenant_id = $1 AND sku_id = $2 AND id = $3`,
      [tenantId, skuId, sheetId]
    );
    if (r.rowCount === 0) return undefined;
    return rowToCostSheet(r.rows[0]);
  }

  async create(
    tenantId: string,
    skuId: string,
    input: {
      batch_no: string;
      cogs_amount: number;
      cogs_currency?: string;
      freight_alloc_mxn?: number;
      freight_alloc_rule?: CostSheetRecord["freight_alloc_rule"];
      effective_from?: string;
      source?: string;
    }
  ): Promise<CostSheetRecord> {
    if (!input.batch_no?.trim()) throw new Error("BATCH_NO_REQUIRED");
    if (!Number.isFinite(input.cogs_amount) || input.cogs_amount <= 0) {
      throw new Error("COGS_AMOUNT_INVALID");
    }
    seq += 1;
    const id = `cs-${Date.now()}-${seq}`;
    const effective_from = input.effective_from ?? new Date().toISOString();
    await this.pool.query(
      `INSERT INTO cost_sheets
        (id, tenant_id, sku_id, batch_no, cogs_amount, cogs_currency, freight_alloc_mxn, freight_alloc_rule, effective_from, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        tenantId,
        skuId,
        input.batch_no.trim(),
        input.cogs_amount,
        (input.cogs_currency ?? "MXN").toUpperCase(),
        input.freight_alloc_mxn ?? 0,
        input.freight_alloc_rule ?? "PER_UNIT",
        effective_from,
        input.source ?? "manual",
      ]
    );
    return {
      id,
      tenant_id: tenantId,
      sku_id: skuId,
      batch_no: input.batch_no.trim(),
      cogs_amount: input.cogs_amount,
      cogs_currency: (input.cogs_currency ?? "MXN").toUpperCase(),
      freight_alloc_mxn: input.freight_alloc_mxn ?? 0,
      freight_alloc_rule: input.freight_alloc_rule ?? "PER_UNIT",
      effective_from,
      source: input.source ?? "manual",
    };
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM cost_sheets`);
    seq = 0;
  }
}

function rowToCostSheet(row: Record<string, unknown>): CostSheetRecord {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    sku_id: row.sku_id as string,
    batch_no: row.batch_no as string,
    cogs_amount: Number(row.cogs_amount),
    cogs_currency: row.cogs_currency as string,
    freight_alloc_mxn: Number(row.freight_alloc_mxn),
    freight_alloc_rule: row.freight_alloc_rule as CostSheetRecord["freight_alloc_rule"],
    effective_from: new Date(row.effective_from as string).toISOString(),
    source: row.source as string,
  };
}
