import type { AgentToolAuditRepository } from "./agent-audit-types.js";
import { MemoryAgentToolAuditRepository } from "./memory-agent-audit.js";
import { PostgresAgentToolAuditRepository } from "./postgres-agent-audit.js";

let singleton: AgentToolAuditRepository | undefined;

export function createAgentToolAuditRepository(): AgentToolAuditRepository {
  if (process.env.AGENT_AUDIT_DRIVER === "memory") {
    return new MemoryAgentToolAuditRepository();
  }
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return new PostgresAgentToolAuditRepository(url);
  }
  return new MemoryAgentToolAuditRepository();
}

export function getAgentToolAuditRepository(): AgentToolAuditRepository {
  if (!singleton) {
    singleton = createAgentToolAuditRepository();
  }
  return singleton;
}

export function setAgentToolAuditRepository(
  repo: AgentToolAuditRepository
): void {
  singleton = repo;
}

export { MemoryAgentToolAuditRepository } from "./memory-agent-audit.js";
export type {
  AgentToolInvocationRecord,
  AgentToolAuditRepository,
} from "./agent-audit-types.js";
