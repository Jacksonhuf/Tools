-- Prod Wave 4: agent audit + reconciliation alert columns

CREATE TABLE IF NOT EXISTS agent_tool_audit (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  session_id TEXT,
  arguments_json JSONB NOT NULL DEFAULT '{}',
  result_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tool_audit_tenant
  ON agent_tool_audit (tenant_id, created_at DESC);

ALTER TABLE reconciliation_alerts
  ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'warning';

ALTER TABLE reconciliation_alerts
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
