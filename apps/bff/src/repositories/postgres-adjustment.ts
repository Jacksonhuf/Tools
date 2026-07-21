import pg from "pg";
import type {
  AdjustmentBatchRecord,
  AdjustmentRepository,
  AdjustmentStatus,
} from "./adjustment-types.js";

function mapBatch(
  row: Record<string, unknown>,
  items: AdjustmentBatchRecord["items"]
): AdjustmentBatchRecord {
  return {
    id: `adj-${row.id}`,
    tenant_id: row.tenant_id as string,
    status: row.status as AdjustmentStatus,
    reason_code: (row.reason_code as string) ?? null,
    created_at: new Date(row.created_at as string).toISOString(),
    approved_at: row.approved_at
      ? new Date(row.approved_at as string).toISOString()
      : null,
    applied_at: row.applied_at
      ? new Date(row.applied_at as string).toISOString()
      : null,
    items,
  };
}

export class PostgresAdjustmentRepository implements AdjustmentRepository {
  readonly driver = "postgres" as const;
  private pool: pg.Pool;

  constructor(connectionStringOrPool: string | pg.Pool) {
    this.pool =
      typeof connectionStringOrPool === "string"
        ? new pg.Pool({ connectionString: connectionStringOrPool })
        : connectionStringOrPool;
  }

  async createBatch(input: {
    tenant_id: string;
    reason_code?: string;
    status: AdjustmentStatus;
    items: Array<{
      listing_id: string;
      explicit_price_mxn: number;
      from_price_mxn: number | null;
      guard_result: string | null;
    }>;
  }): Promise<AdjustmentBatchRecord> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const ins = await client.query(
        `INSERT INTO adjustment_batches (tenant_id, status, reason_code)
         VALUES ($1, $2, $3) RETURNING *`,
        [input.tenant_id, input.status, input.reason_code ?? null]
      );
      const batchRow = ins.rows[0];
      const items: AdjustmentBatchRecord["items"] = [];
      for (const it of input.items) {
        const ir = await client.query(
          `INSERT INTO adjustment_items
           (batch_id, listing_id, explicit_price_mxn, from_price_mxn, guard_result)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [
            batchRow.id,
            it.listing_id,
            it.explicit_price_mxn,
            it.from_price_mxn,
            it.guard_result,
          ]
        );
        items.push({
          id: `adji-${ir.rows[0].id}`,
          batch_id: `adj-${batchRow.id}`,
          listing_id: it.listing_id,
          explicit_price_mxn: it.explicit_price_mxn,
          from_price_mxn: it.from_price_mxn,
          guard_result: it.guard_result,
          to_version_id: null,
        });
      }
      await client.query("COMMIT");
      return mapBatch(batchRow, items);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async getBatch(tenantId: string, batchId: string) {
    const numericId = batchId.replace(/^adj-/, "");
    const br = await this.pool.query(
      `SELECT * FROM adjustment_batches WHERE id = $1 AND tenant_id = $2`,
      [numericId, tenantId]
    );
    if (br.rowCount === 0) return undefined;
    const ir = await this.pool.query(
      `SELECT * FROM adjustment_items WHERE batch_id = $1`,
      [numericId]
    );
    const items = ir.rows.map((row) => ({
      id: `adji-${row.id}`,
      batch_id: `adj-${row.batch_id}`,
      listing_id: row.listing_id,
      explicit_price_mxn: Number(row.explicit_price_mxn),
      from_price_mxn:
        row.from_price_mxn != null ? Number(row.from_price_mxn) : null,
      guard_result: row.guard_result,
      to_version_id: row.to_version_id,
    }));
    return mapBatch(br.rows[0], items);
  }

  async listBatches(tenantId: string, limit = 50) {
    const br = await this.pool.query(
      `SELECT * FROM adjustment_batches
       WHERE tenant_id = $1 ORDER BY id DESC LIMIT $2`,
      [tenantId, limit]
    );
    const result: AdjustmentBatchRecord[] = [];
    for (const row of br.rows) {
      const ir = await this.pool.query(
        `SELECT * FROM adjustment_items WHERE batch_id = $1`,
        [row.id]
      );
      const items = ir.rows.map((itemRow) => ({
        id: `adji-${itemRow.id}`,
        batch_id: `adj-${itemRow.batch_id}`,
        listing_id: itemRow.listing_id,
        explicit_price_mxn: Number(itemRow.explicit_price_mxn),
        from_price_mxn:
          itemRow.from_price_mxn != null
            ? Number(itemRow.from_price_mxn)
            : null,
        guard_result: itemRow.guard_result,
        to_version_id: itemRow.to_version_id,
      }));
      result.push(mapBatch(row, items));
    }
    return result;
  }

  async updateBatchStatus(
    tenantId: string,
    batchId: string,
    status: AdjustmentStatus,
    extra?: { approved_at?: string; applied_at?: string }
  ) {
    const numericId = batchId.replace(/^adj-/, "");
    const r = await this.pool.query(
      `UPDATE adjustment_batches
       SET status = $3,
           approved_at = COALESCE($4, approved_at),
           applied_at = COALESCE($5, applied_at)
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      [
        numericId,
        tenantId,
        status,
        extra?.approved_at ?? null,
        extra?.applied_at ?? null,
      ]
    );
    if (r.rowCount === 0) return undefined;
    return this.getBatch(tenantId, batchId);
  }

  async setItemVersionId(
    batchId: string,
    itemId: string,
    to_version_id: string
  ): Promise<void> {
    const batchNum = batchId.replace(/^adj-/, "");
    const itemNum = itemId.replace(/^adji-/, "");
    await this.pool.query(
      `UPDATE adjustment_items SET to_version_id = $3
       WHERE batch_id = $1 AND id = $2`,
      [batchNum, itemNum, to_version_id]
    );
  }
}
