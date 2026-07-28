export interface StoredExport {
  export_id: string;
  tenant_id: string;
  kind: string;
  content_type: string;
  body: string;
  token: string;
  created_at: string;
  expires_at: string;
  storage_key?: string;
}
