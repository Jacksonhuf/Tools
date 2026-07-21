import type {
  AgentToolAuditRepository,
  AgentToolInvocationRecord,
} from "./agent-audit-types.js";

let seq = 0;
const rows: AgentToolInvocationRecord[] = [];

export class MemoryAgentToolAuditRepository implements AgentToolAuditRepository {
  async recordInvocation(
    input: Omit<AgentToolInvocationRecord, "id" | "created_at">
  ): Promise<AgentToolInvocationRecord> {
    seq += 1;
    const record: AgentToolInvocationRecord = {
      id: `agent-audit-${seq}`,
      created_at: new Date().toISOString(),
      ...input,
    };
    rows.push(record);
    return record;
  }

  async listInvocations(tenantId: string, limit = 50) {
    return rows
      .filter((r) => r.tenant_id === tenantId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, limit);
  }

  resetForTests(): void {
    rows.length = 0;
    seq = 0;
  }
}
