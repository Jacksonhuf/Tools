import type { AgentToolAuditRepository } from "./agent-audit-types.js";
import { MemoryAgentToolAuditRepository } from "./memory-agent-audit.js";

let singleton: AgentToolAuditRepository | undefined;

export function getAgentToolAuditRepository(): AgentToolAuditRepository {
  if (!singleton) {
    singleton = new MemoryAgentToolAuditRepository();
  }
  return singleton;
}

export { MemoryAgentToolAuditRepository } from "./memory-agent-audit.js";
export type { AgentToolInvocationRecord, AgentToolAuditRepository } from "./agent-audit-types.js";
