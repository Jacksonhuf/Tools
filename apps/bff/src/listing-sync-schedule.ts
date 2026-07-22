export interface ListingSyncSchedule {
  tenant_id: string;
  enabled: boolean;
  cron_expression: string;
  note: string;
  updated_at: string;
}

const DEFAULT_CRON = "0 */6 * * *";

const byTenant = new Map<string, ListingSyncSchedule>();

export function getListingSyncSchedule(tenantId: string): ListingSyncSchedule {
  return (
    byTenant.get(tenantId) ?? {
      tenant_id: tenantId,
      enabled: false,
      cron_expression: DEFAULT_CRON,
      note: "stub — wire to async worker in production",
      updated_at: new Date(0).toISOString(),
    }
  );
}

export function upsertListingSyncSchedule(
  tenantId: string,
  patch: { enabled?: boolean; cron_expression?: string }
): ListingSyncSchedule {
  const current = getListingSyncSchedule(tenantId);
  const next: ListingSyncSchedule = {
    ...current,
    tenant_id: tenantId,
    enabled: patch.enabled ?? current.enabled,
    cron_expression: patch.cron_expression?.trim() || current.cron_expression,
    updated_at: new Date().toISOString(),
  };
  byTenant.set(tenantId, next);
  return next;
}

export function resetListingSyncScheduleForTests(): void {
  byTenant.clear();
}
