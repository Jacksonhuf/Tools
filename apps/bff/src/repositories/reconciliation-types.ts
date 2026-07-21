export interface ReconciliationAlertRecord {
  id: string;
  tenant_id: string;
  listing_id: string;
  channel: string;
  active_price_mxn: number;
  channel_price_mxn: number;
  delta_mxn: number;
  severity: "warning";
  created_at: string;
  resolved_at: string | null;
}

export interface ReconciliationAlertRepository {
  createAlert(
    input: Omit<ReconciliationAlertRecord, "id" | "created_at" | "resolved_at">
  ): Promise<ReconciliationAlertRecord>;
  listAlerts(tenantId: string): Promise<ReconciliationAlertRecord[]>;
  resetForTests?(): void;
}
