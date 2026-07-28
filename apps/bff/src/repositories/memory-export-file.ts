import { randomBytes } from "node:crypto";
import type { StoredExport } from "../export-file-types.js";
import type { ExportFileRepository } from "./export-file-types.js";

const exports = new Map<string, StoredExport>();

export class MemoryExportFileRepository implements ExportFileRepository {
  readonly driver = "memory" as const;

  async create(input: {
    tenant_id: string;
    kind: string;
    content_type: string;
    body: string;
    ttl_sec?: number;
    storage_key?: string | null;
  }): Promise<{ export_id: string; token: string; expires_at: string }> {
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
      storage_key: input.storage_key ?? undefined,
    });
    return { export_id, token, expires_at };
  }

  async get(
    tenantId: string,
    exportId: string,
    token: string
  ): Promise<StoredExport | undefined> {
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

  async resetForTests(): Promise<void> {
    exports.clear();
  }
}
