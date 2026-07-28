export interface AuthPermissions {
  pricing_read: boolean;
  pricing_write: boolean;
  channel_admin: boolean;
  finance_approve: boolean;
  ops_read: boolean;
}

export interface AuthPrincipalView {
  subject: string;
  tenant_id: string;
  roles: string[];
  permissions: AuthPermissions;
}

export const DEFAULT_PERMISSIONS: AuthPermissions = {
  pricing_read: true,
  pricing_write: true,
  channel_admin: true,
  finance_approve: true,
  ops_read: true,
};
