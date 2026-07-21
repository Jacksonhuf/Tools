export interface VersionAuditFields {
  trigger_event_id?: string | null;
  dynamic_rule_id?: string | null;
  competitor_snapshot_ids?: string[];
  floor_snapshot_id?: string | null;
  cost_snapshot_id?: string | null;
}
