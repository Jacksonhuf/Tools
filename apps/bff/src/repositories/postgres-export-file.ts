import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import type { StoredExport } from "../export-file-types.js";
import type { ExportFileRepository } from "./export-file-types.js";

export class PostgresExportFileRepository implements ExportFileRepository {
  readonly driver = "postgres" as const;
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async create(input: {
    tenant_id: string;
    kind: string;
    content_type: string;
    body: string;
    ttl_sec?: number;
    storage_key?: string | null;
  }): Promise<{ export_id: string; token: string; expires_at: string }> {
    const export_id = `exp-${Date.now()}-${randomBytes(4).toString("hex")}`;
    const token = randomBytes(16).toString("hex");
    const ttl = input.ttl_sec ?? 3600;
    const expires_at = new Date(Date.now() + ttl * 1000).toISOString();
    await this.pool.query(
      `INSERT INTO export_files
        (export_id, tenant_id, kind, content_type, storage_key, body_text, token, created_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8)`,
      [
        export_id,
        input.tenant_id,
        input.kind,
        input.content_type,
        input.storage_key ?? null,
        input.storage_key ? null : input.body,
        token,
        expires_at,
      ]
    );
    return { export_id, token, expires_at };
  }

  async get(
    tenantId: string,
    exportId: string,
    token: string
  ): Promise<StoredExport | undefined> {
    const r = await this.pool.query(
      `SELECT * FROM export_files
       WHERE export_id = $1 AND tenant_id = $2 AND token = $3`,
      [exportId, tenantId, token]
    );
    if (r.rowCount === 0) return undefined;
    const row = r.rows[0];
    const expires_at = new Date(row.expires_at as string).toISOString();
    if (new Date(expires_at).getTime() < Date.now()) {
      await this.pool.query(`DELETE FROM export_files WHERE export_id = $1`, [
        exportId,
      ]);
      return undefined;
    }
    return {
      export_id: row.export_id as string,
      tenant_id: row.tenant_id as string,
      kind: row.kind as string,
      content_type: row.content_type as string,
      body: (row.body_text as string | null) ?? "",
      token: row.token as string,
      created_at: new Date(row.created_at as string).toISOString(),
      expires_at,
      storage_key: (row.storage_key as string | null) ?? undefined,
    };
  }

  async resetForTests(): Promise<void> {
    await this.pool.query(`DELETE FROM export_files`);
  }
}
