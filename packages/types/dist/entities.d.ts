import type { AccountStatus, AdminScope, AuditAction, AuthProvider, LicenseStatus, OrderStatus, Role, TransactionStatus, TransactionType } from './roles';
import type { SubdomainStatus } from './subdomain';
import type { PanelTheme } from './user-panel-theme';
export interface SafeUser {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: Role;
    status: AccountStatus;
    licenseId: string | null;
    subdomainSlug: string | null;
    subdomain: string | null;
    subdomainStatus: SubdomainStatus | null;
    subdomainCreatedAt: string | null;
    /** Owning Main Admin for user-role accounts. Null for self-registered users. */
    adminId: string | null;
    /** Sub Admin (or Main Admin) the user account is assigned to. */
    assignedTo: string | null;
    /** Parent Main Admin for Sub Admin accounts. Null for Main Admins / users. */
    parentAdminId: string | null;
    /** Capabilities granted to Sub Admin accounts. Empty for non-Sub Admins. */
    adminScopes: AdminScope[];
    /** Google platform user id when this account is Google-linked, else null. */
    googleId: string | null;
    /** Authentication provider(s) used by this account. */
    authProvider: AuthProvider;
    /** Profile image URL (e.g. from Google) when available, else null. */
    profileImage: string | null;
    /** True when the email was confirmed by the identity provider. */
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface License {
    id: string;
    licenseKey: string;
    adminUserId: string;
    adminUserName?: string;
    adminUserEmail?: string;
    adminSubdomainSlug?: string | null;
    adminSubdomain?: string | null;
    adminSubdomainStatus?: SubdomainStatus | null;
    status: LicenseStatus;
    issuedAt: string;
    expiresAt: string;
    maxUsers: number;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface Category {
    id: string;
    name: string;
    slug: string;
    icon: string;
    status: 'active' | 'inactive';
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}
export interface Service {
    id: string;
    name: string;
    categoryId: string;
    categoryName?: string;
    description: string;
    price: number;
    minOrder: number;
    maxOrder: number;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}
export interface Order {
    id: string;
    userId: string;
    userName?: string;
    serviceId: string;
    serviceName: string;
    categoryName?: string;
    link: string;
    quantity: number;
    price: number;
    status: OrderStatus;
    startCounter: number;
    remaining: number;
    createdAt: string;
    updatedAt: string;
}
export interface Transaction {
    id: string;
    userId: string;
    userName?: string;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    balanceAfter: number;
    reference: string;
    description: string;
    createdAt: string;
}
export interface Wallet {
    id: string;
    userId: string;
    balance: number;
    totalDeposited: number;
    totalSpent: number;
    currency: string;
    updatedAt: string;
}
export interface PaymentMethod {
    id: string;
    name: string;
    code: string;
    enabled: boolean;
    instructions: string;
    config: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface PlatformSettings {
    siteName: string;
    youtubeLink: string;
    telegramLink: string;
    supportEmail: string;
    currency: string;
    minDeposit: number;
    registrationEnabled: boolean;
    updatedAt: string;
}
/**
 * Tenant-level User Panel theme selection, controlled by a Main Admin for the
 * users under their `adminId`. Independent per admin — no global value exists.
 */
export interface UserThemeSettings {
    adminId: string;
    theme: PanelTheme;
    allowUserOverride: boolean;
    updatedBy: string | null;
    updatedAt: string | null;
}
/** Per-user theme override. Only honored when the admin allows overrides. */
export interface UserThemePreference {
    userId: string;
    theme: PanelTheme;
    updatedBy: string | null;
    updatedAt: string | null;
}
/**
 * Super-Admin controlled configuration for one admin tenant:
 *  - theme:            the Admin Panel theme for that admin account.
 *  - enabledThemes:    User Panel themes the admin may activate for their users.
 *  - defaultTheme:     User Panel theme new/unset tenants fall back to.
 */
export interface AdminThemeSettings {
    adminId: string;
    theme: PanelTheme;
    enabledThemes: PanelTheme[];
    defaultTheme: PanelTheme;
    updatedBy: string | null;
    updatedAt: string | null;
}
/** Resolved, server-computed theme for a user (never trusts the client). */
export interface UserThemeResolution {
    theme: PanelTheme;
    allowUserOverride: boolean;
    overrideApplied: boolean;
    source: 'tenant' | 'override' | 'default';
    tenantAdminId: string | null;
}
export interface AuditLog {
    id: string;
    actorId: string | null;
    actorName: string;
    actorRole: Role | 'system';
    action: AuditAction | string;
    targetType: string;
    targetId: string;
    targetLabel: string;
    result: 'success' | 'failure';
    ip: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}
export interface SessionInfo {
    user: SafeUser;
    license?: License | null;
    wallet?: Wallet | null;
}
/**
 * Server-computed license verdict for the authenticated admin. `valid` is
 * derived from the database on every request; the client must never compute
 * or cache this decision.
 */
export interface LicenseState {
    license: License | null;
    valid: boolean;
    reason: string | null;
}
/** Response payload for admin login / session restoration. */
export interface AuthSessionState {
    user: SafeUser;
    license: License | null;
    licenseValid: boolean;
    licenseReason: string | null;
}
export interface Paginated<T> {
    items: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
export interface AnalyticsOverview {
    totalUsers: number;
    totalAdmins: number;
    activeAdmins: number;
    suspendedAdmins: number;
    activeLicenses: number;
    expiredLicenses: number;
    revenue: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    walletBalance: number;
    totalDeposited: number;
    totalSpent: number;
    ordersByDay: {
        date: string;
        count: number;
        amount: number;
    }[];
    revenueByDay: {
        date: string;
        amount: number;
    }[];
}
