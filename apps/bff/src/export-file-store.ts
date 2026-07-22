import { randomBytes } from "node:crypto";

export interface StoredExport {
  export_id: string;
  tenant_id: string;
  kind: string;
  content_type: string;
  body: string;
  token: string;
  created_at: string;
  expires_at: string;
}

const exports = new Map<string, StoredExport>();

export function createStoredExport(input: {
  tenant_id: string;
  kind: string;
  content_type: string;
  body: string;
  ttl_sec?: number;
}): { export_id: string; token: string; expires_at: string } {
  const export_id = `exp-${Date.now()}-${exports.size + 1}`;
  const token = randomBytes(16).toString("hex");
  const ttl = input.ttl_sec ?? 3600;
  const expires_at = new Date(Date.now() + ttl * 1000).toISOString();
  exports.set(export_id, {
    export_id,
    tenant_id: input.tenant_id,
    kind: input.kind,
    content_type: input.content_type,
    body: input.body,
    token,
    created_at: new Date().toISOString(),
    expires_at,
  });
  return { export_id, token, expires_at };
}

export function getStoredExport(
  tenantId: string,
  exportId: string,
  token: string
): StoredExport | undefined {
  const row = exports.get(exportId);
  if (!row || row.tenant_id !== tenantId || row.token !== token) {
    return undefined;
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    exports.delete(exportId);
    return undefined;
  }
  return row;
}

export function resetStoredExportsForTests(): void {
  exports.clear();
}
