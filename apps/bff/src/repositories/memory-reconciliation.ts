import type {
  ReconciliationAlertRecord,
  ReconciliationAlertRepository,
} from "./reconciliation-types.js";

let seq = 0;
const alerts: ReconciliationAlertRecord[] = [];

export class MemoryReconciliationAlertRepository
  implements ReconciliationAlertRepository
{
  async createAlert(
    input: Omit<ReconciliationAlertRecord, "id" | "created_at" | "resolved_at">
  ): Promise<ReconciliationAlertRecord> {
    seq += 1;
    const record: ReconciliationAlertRecord = {
      id: `recon-alert-${seq}`,
      created_at: new Date().toISOString(),
      resolved_at: null,
      ...input,
    };
    alerts.push(record);
    return record;
  }

  async listAlerts(tenantId: string): Promise<ReconciliationAlertRecord[]> {
    return alerts
      .filter((a) => a.tenant_id === tenantId && a.resolved_at === null)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }

  resetForTests(): void {
    alerts.length = 0;
    seq = 0;
  }
}
