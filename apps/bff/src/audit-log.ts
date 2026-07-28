import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

export async function recordAuditLog(input: {
  tenant_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  diff_json?: Record<string, unknown>;
}): Promise<void> {
  const p = getPool();
  if (!p) return;
  await p.query(
    `INSERT INTO audit_logs (tenant_id, actor_id, action, entity_type, entity_id, diff_json)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      input.tenant_id,
      input.actor_id,
      input.action,
      input.entity_type,
      input.entity_id,
      JSON.stringify(input.diff_json ?? {}),
    ]
  );
}
