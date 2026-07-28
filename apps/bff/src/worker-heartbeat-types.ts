export interface WorkerHeartbeat {
  worker_id: string;
  reported_at: string;
  tenant_id?: string | null;
  details?: Record<string, unknown>;
}
