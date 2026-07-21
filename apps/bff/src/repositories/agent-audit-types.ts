export interface AgentToolInvocationRecord {
  id: string;
  tenant_id: string;
  tool_name: string;
  session_id: string | null;
  arguments_json: Record<string, unknown>;
  result_summary: string;
  created_at: string;
}

export interface AgentToolAuditRepository {
  recordInvocation(
    input: Omit<AgentToolInvocationRecord, "id" | "created_at">
  ): Promise<AgentToolInvocationRecord>;
  listInvocations(
    tenantId: string,
    limit?: number
  ): Promise<AgentToolInvocationRecord[]>;
  resetForTests?(): void;
}
