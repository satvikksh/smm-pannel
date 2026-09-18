/**
 * Canonical role definition. Every authorization decision in the platform
 * MUST use these exact string values. No aliases, no casing variants.
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * How an account authenticates. `local` = email/password, `google` = Google
 * OAuth only, `local/google` = an email/password account that later linked a
 * verified Google identity. Admins and Super Admins are always `local` — they
 * are never created or linked through Google.
 */
export const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google',
  LOCAL_GOOGLE: 'local/google',
} as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];

export const ALL_ROLES: readonly Role[] = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ALL_ROLES as readonly string[]).includes(value);
}

export const ACCOUNT_STATUSES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
  DELETED: 'deleted',
} as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[keyof typeof ACCOUNT_STATUSES];

export const LICENSE_STATUSES = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const;

export type LicenseStatus = (typeof LICENSE_STATUSES)[keyof typeof LICENSE_STATUSES];

export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PARTIAL: 'partial',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const TRANSACTION_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  REFUND: 'refund',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];

export const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[keyof typeof TRANSACTION_STATUSES];

/**
 * Capabilities a Sub Admin (Partial Admin) can be granted by the Main Admin of
 * a tenant. Every decision is enforced server-side; the client only renders
 * affordances based on these scopes.
 */
export const ADMIN_SCOPES = {
  MANAGE_USERS: 'manageUsers',
  MANAGE_USER_THEME: 'manageUserTheme',
  VIEW_USERS: 'viewUsers',
  VIEW_ORDERS: 'viewOrders',
} as const;

export type AdminScope = (typeof ADMIN_SCOPES)[keyof typeof ADMIN_SCOPES];

export const ALL_ADMIN_SCOPES: readonly AdminScope[] = [
  ADMIN_SCOPES.MANAGE_USERS,
  ADMIN_SCOPES.MANAGE_USER_THEME,
  ADMIN_SCOPES.VIEW_USERS,
  ADMIN_SCOPES.VIEW_ORDERS,
];

export function hasAdminScope(scopes: readonly AdminScope[] | undefined, scope: AdminScope): boolean {
  return Array.isArray(scopes) && scopes.includes(scope);
}

export function isAdminScope(value: unknown): value is AdminScope {
  return typeof value === 'string' && (ALL_ADMIN_SCOPES as readonly string[]).includes(value);
}

export const AUDIT_ACTIONS = {
  SUPER_ADMIN_LOGIN: 'super_admin.login',
  ADMIN_LOGIN: 'admin.login',
  USER_LOGIN: 'user.login',
  ADMIN_CREATE: 'admin.create',
  ADMIN_UPDATE_STATUS: 'admin.update_status',
  ADMIN_RESET_PASSWORD: 'admin.reset_password',
  ADMIN_DELETE: 'admin.delete',
  ADMIN_SUBDOMAIN_UPDATE: 'admin.subdomain.update',
  LICENSE_CREATE: 'license.create',
  LICENSE_UPDATE_STATUS: 'license.update_status',
  LICENSE_RENEW: 'license.renew',
  LICENSE_ACTIVATE: 'license.activate',
  USER_UPDATE_STATUS: 'user.update_status',
  USER_DELETE: 'user.delete',
  USER_GOOGLE_LOGIN: 'user.google.login',
  USER_GOOGLE_REGISTER: 'user.google.register',
  USER_GOOGLE_LINK: 'user.google.link',
  SERVICE_CREATE: 'service.create',
  SERVICE_UPDATE: 'service.update',
  CATEGORY_CREATE: 'category.create',
  CATEGORY_UPDATE: 'category.update',
  ORDER_UPDATE_STATUS: 'order.update_status',
  PAYMENT_METHOD_UPDATE: 'payment_method.update',
  SETTING_UPDATE: 'setting.update',
  SUPER_ADMIN_CHANGED_ADMIN_THEME: 'super_admin.admin_theme.change',
  ADMIN_CHANGED_USER_THEME: 'admin.user_theme.change',
  PARTIAL_ADMIN_CHANGED_USER_THEME: 'partial_admin.user_theme.change',
  USER_THEME_OVERRIDE_CHANGED: 'user.user_theme.override',
  ADMIN_TENANT_USER_CREATE: 'admin.tenant_user.create',
  ADMIN_TENANT_USER_CLAIM: 'admin.tenant_user.claim',
  ADMIN_SUB_ADMIN_CREATE: 'admin.sub_admin.create',
  ADMIN_SUB_ADMIN_UPDATE: 'admin.sub_admin.update',
  ADMIN_SUB_ADMIN_DELETE: 'admin.sub_admin.delete',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
