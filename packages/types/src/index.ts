export { ROLES, ALL_ROLES, isRole } from './roles';
export type {
  Role,
  AuthProvider,
  AccountStatus,
  AdminScope,
  LicenseStatus,
  OrderStatus,
  TransactionType,
  TransactionStatus,
  AuditAction,
} from './roles';
export {
  ACCOUNT_STATUSES,
  AUTH_PROVIDERS,
  LICENSE_STATUSES,
  ORDER_STATUSES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  AUDIT_ACTIONS,
  ADMIN_SCOPES,
  ALL_ADMIN_SCOPES,
  hasAdminScope,
  isAdminScope,
} from './roles';

export {
  PANEL_THEMES,
  DEFAULT_PANEL_THEME,
  PANEL_THEME_LABELS,
  PANEL_THEME_DESCRIPTIONS,
  PANEL_THEME_SWATCHES,
  PREMIUM_PANEL_THEMES,
  PANEL_THEME_DARK,
  isPanelTheme,
} from './user-panel-theme';
export type { PanelTheme } from './user-panel-theme';

export type {
  SafeUser,
  License,
  Category,
  Service,
  Order,
  Transaction,
  Wallet,
  PaymentMethod,
  PlatformSettings,
  UserThemeSettings,
  UserThemePreference,
  AdminThemeSettings,
  UserThemeResolution,
  AuditLog,
  SessionInfo,
  LicenseState,
  AuthSessionState,
  Paginated,
  AnalyticsOverview,
  EngagementBundle,
  EngagementBundlePublic,
  EngagementBundleCatalog,
} from './entities';

export {
  SUBDOMAIN_SLUG_MAX_LENGTH,
  SUBDOMAIN_STATUSES,
  slugifySubdomainSlug,
  isValidSubdomainSlug,
  buildSubdomainHost,
  hostNameOnly,
  subdomainSlugFromHost,
} from './subdomain';
export type { SubdomainStatus } from './subdomain';

export * from './api';
export * from './dto';