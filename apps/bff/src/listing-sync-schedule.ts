export interface ListingSyncSchedule {
  tenant_id: string;
  enabled: boolean;
  cron_expression: string;
  note: string;
  updated_at: string;
  last_run_at: string | null;
}

const DEFAULT_CRON = "0 */6 * * *";

/** Minimal 5-field cron check for ops config (not a full cron parser). */
export function isValidCronExpression(expression: string): boolean {
  const parts = expression.trim().split(/\s+/);
  return parts.length === 5 && parts.every((p) => p.length > 0);
}

const byTenant = new Map<string, ListingSyncSchedule>();

export function getListingSyncSchedule(tenantId: string): ListingSyncSchedule {
  return (
    byTenant.get(tenantId) ?? {
      tenant_id: tenantId,
      enabled: false,
      cron_expression: DEFAULT_CRON,
      note: "stub — wire to async worker in production",
      updated_at: new Date(0).toISOString(),
      last_run_at: null,
    }
  );
}

export function upsertListingSyncSchedule(
  tenantId: string,
  patch: { enabled?: boolean; cron_expression?: string }
): ListingSyncSchedule {
  const current = getListingSyncSchedule(tenantId);
  const cron =
    patch.cron_expression !== undefined
      ? patch.cron_expression.trim()
      : current.cron_expression;
  if (patch.cron_expression !== undefined && !isValidCronExpression(cron)) {
    throw new Error("INVALID_CRON_EXPRESSION");
  }
  const next: ListingSyncSchedule = {
    ...current,
    tenant_id: tenantId,
    enabled: patch.enabled ?? current.enabled,
    cron_expression: cron,
    updated_at: new Date().toISOString(),
    last_run_at: current.last_run_at ?? null,
  };
  byTenant.set(tenantId, next);
  return next;
}

export function markListingSyncScheduleRan(tenantId: string): ListingSyncSchedule {
  const current = getListingSyncSchedule(tenantId);
  const next: ListingSyncSchedule = {
    ...current,
    last_run_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  byTenant.set(tenantId, next);
  return next;
}

export function resetListingSyncScheduleForTests(): void {
  byTenant.clear();
}
