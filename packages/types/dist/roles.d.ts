/**
 * Canonical role definition. Every authorization decision in the platform
 * MUST use these exact string values. No aliases, no casing variants.
 */
export declare const ROLES: {
    readonly SUPER_ADMIN: "super_admin";
    readonly ADMIN: "admin";
    readonly USER: "user";
};
export type Role = (typeof ROLES)[keyof typeof ROLES];
/**
 * How an account authenticates. `local` = email/password, `google` = Google
 * OAuth only, `local/google` = an email/password account that later linked a
 * verified Google identity. Admins and Super Admins are always `local` — they
 * are never created or linked through Google.
 */
export declare const AUTH_PROVIDERS: {
    readonly LOCAL: "local";
    readonly GOOGLE: "google";
    readonly LOCAL_GOOGLE: "local/google";
};
export type AuthProvider = (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];
export declare const ALL_ROLES: readonly Role[];
export declare function isRole(value: unknown): value is Role;
export declare const ACCOUNT_STATUSES: {
    readonly ACTIVE: "active";
    readonly SUSPENDED: "suspended";
    readonly INACTIVE: "inactive";
    readonly DELETED: "deleted";
};
export type AccountStatus = (typeof ACCOUNT_STATUSES)[keyof typeof ACCOUNT_STATUSES];
export declare const LICENSE_STATUSES: {
    readonly ACTIVE: "active";
    readonly SUSPENDED: "suspended";
    readonly REVOKED: "revoked";
    readonly EXPIRED: "expired";
};
export type LicenseStatus = (typeof LICENSE_STATUSES)[keyof typeof LICENSE_STATUSES];
export declare const ORDER_STATUSES: {
    readonly PENDING: "pending";
    readonly PROCESSING: "processing";
    readonly IN_PROGRESS: "in_progress";
    readonly COMPLETED: "completed";
    readonly PARTIAL: "partial";
    readonly CANCELLED: "cancelled";
    readonly FAILED: "failed";
};
export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];
export declare const TRANSACTION_TYPES: {
    readonly CREDIT: "credit";
    readonly DEBIT: "debit";
    readonly REFUND: "refund";
};
export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES];
export declare const TRANSACTION_STATUSES: {
    readonly PENDING: "pending";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly CANCELLED: "cancelled";
};
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[keyof typeof TRANSACTION_STATUSES];
/**
 * Capabilities a Sub Admin (Partial Admin) can be granted by the Main Admin of
 * a tenant. Every decision is enforced server-side; the client only renders
 * affordances based on these scopes.
 */
export declare const ADMIN_SCOPES: {
    readonly MANAGE_USERS: "manageUsers";
    readonly MANAGE_USER_THEME: "manageUserTheme";
    readonly VIEW_USERS: "viewUsers";
    readonly VIEW_ORDERS: "viewOrders";
};
export type AdminScope = (typeof ADMIN_SCOPES)[keyof typeof ADMIN_SCOPES];
export declare const ALL_ADMIN_SCOPES: readonly AdminScope[];
export declare function hasAdminScope(scopes: readonly AdminScope[] | undefined, scope: AdminScope): boolean;
export declare function isAdminScope(value: unknown): value is AdminScope;
export declare const AUDIT_ACTIONS: {
    readonly SUPER_ADMIN_LOGIN: "super_admin.login";
    readonly ADMIN_LOGIN: "admin.login";
    readonly USER_LOGIN: "user.login";
    readonly ADMIN_CREATE: "admin.create";
    readonly ADMIN_UPDATE_STATUS: "admin.update_status";
    readonly ADMIN_RESET_PASSWORD: "admin.reset_password";
    readonly ADMIN_DELETE: "admin.delete";
    readonly ADMIN_SUBDOMAIN_UPDATE: "admin.subdomain.update";
    readonly LICENSE_CREATE: "license.create";
    readonly LICENSE_UPDATE_STATUS: "license.update_status";
    readonly LICENSE_RENEW: "license.renew";
    readonly LICENSE_ACTIVATE: "license.activate";
    readonly USER_UPDATE_STATUS: "user.update_status";
    readonly USER_DELETE: "user.delete";
    readonly USER_GOOGLE_LOGIN: "user.google.login";
    readonly USER_GOOGLE_REGISTER: "user.google.register";
    readonly USER_GOOGLE_LINK: "user.google.link";
    readonly SERVICE_CREATE: "service.create";
    readonly SERVICE_UPDATE: "service.update";
    readonly CATEGORY_CREATE: "category.create";
    readonly CATEGORY_UPDATE: "category.update";
    readonly ORDER_UPDATE_STATUS: "order.update_status";
    readonly PAYMENT_METHOD_UPDATE: "payment_method.update";
    readonly SETTING_UPDATE: "setting.update";
    readonly SUPER_ADMIN_CHANGED_ADMIN_THEME: "super_admin.admin_theme.change";
    readonly ADMIN_CHANGED_USER_THEME: "admin.user_theme.change";
    readonly PARTIAL_ADMIN_CHANGED_USER_THEME: "partial_admin.user_theme.change";
    readonly USER_THEME_OVERRIDE_CHANGED: "user.user_theme.override";
    readonly ADMIN_TENANT_USER_CREATE: "admin.tenant_user.create";
    readonly ADMIN_TENANT_USER_CLAIM: "admin.tenant_user.claim";
    readonly ADMIN_SUB_ADMIN_CREATE: "admin.sub_admin.create";
    readonly ADMIN_SUB_ADMIN_UPDATE: "admin.sub_admin.update";
    readonly ADMIN_SUB_ADMIN_DELETE: "admin.sub_admin.delete";
};
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
