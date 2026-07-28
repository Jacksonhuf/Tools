import { Pool } from "pg";
import type {
  AgentToolAuditRepository,
  AgentToolInvocationRecord,
} from "./agent-audit-types.js";

let seq = 0;

export class PostgresAgentToolAuditRepository
  implements AgentToolAuditRepository
{
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async recordInvocation(
    input: Omit<AgentToolInvocationRecord, "id" | "created_at">
  ): Promise<AgentToolInvocationRecord> {
    seq += 1;
    const id = `agent-audit-${Date.now()}-${seq}`;
    const created_at = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO agent_tool_audit
        (id, tenant_id, tool_name, session_id, arguments_json, result_summary, created_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
      [
        id,
        input.tenant_id,
        input.tool_name,
        input.session_id,
        JSON.stringify(input.arguments_json ?? {}),
        input.result_summary,
        created_at,
      ]
    );
    return { id, created_at, ...input };
  }

  async listInvocations(tenantId: string, limit = 50) {
    const r = await this.pool.query(
      `SELECT * FROM agent_tool_audit
       WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [tenantId, limit]
    );
    return r.rows.map((row) => ({
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      tool_name: row.tool_name as string,
      session_id: (row.session_id as string | null) ?? null,
      arguments_json: row.arguments_json as Record<string, unknown>,
      result_summary: row.result_summary as string,
      created_at: new Date(row.created_at as string).toISOString(),
    }));
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM agent_tool_audit`);
    seq = 0;
  }
}
