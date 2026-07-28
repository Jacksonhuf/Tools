import { Pool } from "pg";
import type {
  ReconciliationAlertRecord,
  ReconciliationAlertRepository,
} from "./reconciliation-types.js";

let seq = 0;

export class PostgresReconciliationAlertRepository
  implements ReconciliationAlertRepository
{
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async createAlert(
    input: Omit<ReconciliationAlertRecord, "id" | "created_at" | "resolved_at">
  ): Promise<ReconciliationAlertRecord> {
    seq += 1;
    const id = `recon-alert-${Date.now()}-${seq}`;
    const created_at = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO reconciliation_alerts
        (id, tenant_id, listing_id, channel, active_price_mxn, channel_price_mxn, delta_mxn, severity, status, created_at, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,NULL)`,
      [
        id,
        input.tenant_id,
        input.listing_id,
        input.channel,
        input.active_price_mxn,
        input.channel_price_mxn,
        input.delta_mxn,
        input.severity,
        created_at,
      ]
    );
    return { id, created_at, resolved_at: null, ...input };
  }

  async listAlerts(tenantId: string): Promise<ReconciliationAlertRecord[]> {
    const r = await this.pool.query(
      `SELECT * FROM reconciliation_alerts
       WHERE tenant_id = $1 AND resolved_at IS NULL
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return r.rows.map((row) => ({
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      listing_id: row.listing_id as string,
      channel: row.channel as string,
      active_price_mxn: Number(row.active_price_mxn),
      channel_price_mxn: Number(row.channel_price_mxn),
      delta_mxn: Number(row.delta_mxn),
      severity: (row.severity as "warning") ?? "warning",
      created_at: new Date(row.created_at as string).toISOString(),
      resolved_at: row.resolved_at
        ? new Date(row.resolved_at as string).toISOString()
        : null,
    }));
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM reconciliation_alerts`);
    seq = 0;
  }
}
