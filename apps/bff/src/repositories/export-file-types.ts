import type { StoredExport } from "../export-file-types.js";

export interface ExportFileRepository {
  readonly driver: "memory" | "postgres" | "s3";
  create(input: {
    tenant_id: string;
    kind: string;
    content_type: string;
    body: string;
    ttl_sec?: number;
    storage_key?: string | null;
  }): Promise<{ export_id: string; token: string; expires_at: string }>;
  get(
    tenantId: string,
    exportId: string,
    token: string
  ): Promise<StoredExport | undefined>;
  resetForTests(): Promise<void>;
}
