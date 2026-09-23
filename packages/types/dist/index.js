// src/roles.ts
var ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  USER: "user"
};
var AUTH_PROVIDERS = {
  LOCAL: "local",
  GOOGLE: "google",
  LOCAL_GOOGLE: "local/google"
};
var ALL_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.USER];
function isRole(value) {
  return typeof value === "string" && ALL_ROLES.includes(value);
}
var ACCOUNT_STATUSES = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  INACTIVE: "inactive",
  DELETED: "deleted",
  PENDING: "pending",
  REJECTED: "rejected"
};
var LICENSE_STATUSES = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  REVOKED: "revoked",
  EXPIRED: "expired"
};
var ORDER_STATUSES = {
  PENDING: "pending",
  PROCESSING: "processing",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  PARTIAL: "partial",
  CANCELLED: "cancelled",
  FAILED: "failed"
};
var TRANSACTION_TYPES = {
  CREDIT: "credit",
  DEBIT: "debit",
  REFUND: "refund"
};
var TRANSACTION_STATUSES = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
};
var ADMIN_SCOPES = {
  MANAGE_USERS: "manageUsers",
  MANAGE_USER_THEME: "manageUserTheme",
  VIEW_USERS: "viewUsers",
  VIEW_ORDERS: "viewOrders"
};
var ALL_ADMIN_SCOPES = [
  ADMIN_SCOPES.MANAGE_USERS,
  ADMIN_SCOPES.MANAGE_USER_THEME,
  ADMIN_SCOPES.VIEW_USERS,
  ADMIN_SCOPES.VIEW_ORDERS
];
function hasAdminScope(scopes, scope) {
  return Array.isArray(scopes) && scopes.includes(scope);
}
function isAdminScope(value) {
  return typeof value === "string" && ALL_ADMIN_SCOPES.includes(value);
}
var AUDIT_ACTIONS = {
  SUPER_ADMIN_LOGIN: "super_admin.login",
  ADMIN_LOGIN: "admin.login",
  USER_LOGIN: "user.login",
  ADMIN_CREATE: "admin.create",
  ADMIN_REGISTER: "admin.register",
  ADMIN_APPROVE: "admin.approve",
  ADMIN_REJECT: "admin.reject",
  ADMIN_UPDATE_STATUS: "admin.update_status",
  ADMIN_RESET_PASSWORD: "admin.reset_password",
  ADMIN_DELETE: "admin.delete",
  ADMIN_SUBDOMAIN_UPDATE: "admin.subdomain.update",
  ADMIN_GOOGLE_REGISTER: "admin.google.register",
  ADMIN_GOOGLE_LOGIN: "admin.google.login",
  ADMIN_GOOGLE_LINK: "admin.google.link",
  LICENSE_CREATE: "license.create",
  LICENSE_UPDATE_STATUS: "license.update_status",
  LICENSE_RENEW: "license.renew",
  LICENSE_ACTIVATE: "license.activate",
  USER_UPDATE_STATUS: "user.update_status",
  USER_DELETE: "user.delete",
  USER_GOOGLE_LOGIN: "user.google.login",
  USER_GOOGLE_REGISTER: "user.google.register",
  USER_GOOGLE_LINK: "user.google.link",
  SERVICE_CREATE: "service.create",
  SERVICE_UPDATE: "service.update",
  CATEGORY_CREATE: "category.create",
  CATEGORY_UPDATE: "category.update",
  ENGAGEMENT_BUNDLE_CREATE: "engagement_bundle.create",
  ENGAGEMENT_BUNDLE_UPDATE: "engagement_bundle.update",
  ENGAGEMENT_BUNDLE_DELETE: "engagement_bundle.delete",
  ENGAGEMENT_BUNDLE_STATUS: "engagement_bundle.update_status",
  ORDER_UPDATE_STATUS: "order.update_status",
  PAYMENT_METHOD_UPDATE: "payment_method.update",
  SETTING_UPDATE: "setting.update",
  SUPER_ADMIN_CHANGED_ADMIN_THEME: "super_admin.admin_theme.change",
  SUPER_ADMIN_CHANGED_PLATFORM_THEME: "super_admin.platform_theme.change",
  ADMIN_CHANGED_PANEL_THEME: "admin.panel_theme.change",
  ADMIN_CHANGED_USER_THEME: "admin.user_theme.change",
  PARTIAL_ADMIN_CHANGED_USER_THEME: "partial_admin.user_theme.change",
  USER_THEME_OVERRIDE_CHANGED: "user.user_theme.override",
  ADMIN_TENANT_USER_CREATE: "admin.tenant_user.create",
  ADMIN_TENANT_USER_CLAIM: "admin.tenant_user.claim",
  ADMIN_SUB_ADMIN_CREATE: "admin.sub_admin.create",
  ADMIN_SUB_ADMIN_UPDATE: "admin.sub_admin.update",
  ADMIN_SUB_ADMIN_DELETE: "admin.sub_admin.delete"
};

// src/user-panel-theme.ts
var PANEL_THEMES = [
  "modern-light",
  "modern-dark",
  "premium-gradient",
  "vibrant-neon",
  "sunset-tropical",
  "ocean-aurora"
];
var DEFAULT_PANEL_THEME = "modern-light";
var PREMIUM_PANEL_THEMES = [
  "vibrant-neon",
  "sunset-tropical",
  "ocean-aurora"
];
var PANEL_THEME_LABELS = {
  "modern-light": "Modern Light",
  "modern-dark": "Modern Dark",
  "premium-gradient": "Premium Gradient",
  "vibrant-neon": "Vibrant Neon",
  "sunset-tropical": "Sunset Tropical",
  "ocean-aurora": "Ocean Aurora"
};
var PANEL_THEME_DESCRIPTIONS = {
  "modern-light": "Clean light interface",
  "modern-dark": "Premium navy dark mode",
  "premium-gradient": "Warm gradient colors",
  "vibrant-neon": "Electric purple, pink & cyan on deep space",
  "sunset-tropical": "Warm orange, coral & pink sunsets",
  "ocean-aurora": "Cool cyan, blue & purple northern lights"
};
var PANEL_THEME_SWATCHES = {
  "modern-light": ["#4f46e5", "#6366f1", "#a5b4fc"],
  "modern-dark": ["#6366f1", "#818cf8", "#60a5fa"],
  "premium-gradient": ["#f97316", "#f43f5e", "#ec4899"],
  "vibrant-neon": ["#a855f7", "#ec4899", "#22d3ee"],
  "sunset-tropical": ["#ff8a3d", "#ff4d6d", "#ffd166"],
  "ocean-aurora": ["#06b6d4", "#2563eb", "#8b5cf6"]
};
var PANEL_THEME_DARK = ["modern-dark", "vibrant-neon"];
function isPanelTheme(value) {
  return typeof value === "string" && PANEL_THEMES.includes(value);
}

// src/subdomain.ts
var SUBDOMAIN_SLUG_MAX_LENGTH = 50;
var SUBDOMAIN_STATUSES = {
  ACTIVE: "active",
  DISABLED: "disabled"
};
var SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
function slugifySubdomainSlug(value) {
  const base = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
  return base.slice(0, SUBDOMAIN_SLUG_MAX_LENGTH);
}
function isValidSubdomainSlug(slug) {
  return slug.length > 0 && slug.length <= SUBDOMAIN_SLUG_MAX_LENGTH && SLUG_RE.test(slug);
}
function buildSubdomainHost(slug, rootDomain) {
  return `${slug}.${rootDomain}`;
}
function hostNameOnly(host) {
  const trimmed = host.trim().toLowerCase();
  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon > 0 && /^\d+$/.test(trimmed.slice(lastColon + 1))) {
    return trimmed.slice(0, lastColon);
  }
  return trimmed;
}
function subdomainSlugFromHost(host, rootDomain) {
  const hostname = hostNameOnly(host);
  if (!hostname || hostname === rootDomain) return null;
  const suffix = `.${rootDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  return isValidSubdomainSlug(slug) ? slug : null;
}

// src/api.ts
var API_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY: 429,
  UNAVAILABLE: 503,
  INTERNAL: 500
};
var FRIENDLY_MESSAGES = {
  400: "The request was invalid. Please check the details and try again.",
  401: "Your session has expired. Please login again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "An account or license with this information already exists.",
  422: "Some of the submitted information is invalid.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Server error. Please try again."
};
function friendlyMessage(status, serverMessage) {
  return serverMessage && serverMessage.trim().length > 0 ? serverMessage : FRIENDLY_MESSAGES[status] ?? "Something went wrong. Please try again.";
}
var ApiError = class _ApiError extends Error {
  status;
  code;
  details;
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
  static badRequest(message = "Bad request", details) {
    return new _ApiError(400, "BAD_REQUEST", message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new _ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have permission to perform this action") {
    return new _ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Resource not found") {
    return new _ApiError(404, "NOT_FOUND", message);
  }
  static conflict(message, details) {
    return new _ApiError(409, "CONFLICT", message, details);
  }
  static validation(message = "Validation failed", details) {
    return new _ApiError(422, "VALIDATION_ERROR", message, details);
  }
  static licenseInvalid(message = "License is not valid") {
    return new _ApiError(403, "LICENSE_INVALID", message);
  }
  static internal(message = "Server error") {
    return new _ApiError(500, "INTERNAL", message);
  }
  static serviceUnavailable(message = "The service is temporarily unavailable") {
    return new _ApiError(503, "SERVICE_UNAVAILABLE", message);
  }
};

// src/dto/auth.ts
import { z as z2 } from "zod";

// src/dto/common.ts
import { z } from "zod";
var idSchema = z.string().trim().min(1, "Required");
var paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(200).optional().default(""),
  sort: z.string().trim().max(50).optional()
});
function paginated(items, total, page, limit) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
}
var passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long");

// src/dto/auth.ts
var loginSchema = z2.object({
  email: z2.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z2.string().min(1, "Password is required")
});
var adminLoginSchema = z2.object({
  email: z2.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z2.string().min(1, "Password is required")
});
var nameSchema = z2.string().trim().min(2, "Name must be at least 2 characters").max(120);
var phoneSchema = z2.string().trim().min(6, "Enter a valid phone number").max(25).regex(/^[+]?[0-9 ()-]+$/, "Enter a valid phone number");
var registerSchema = z2.object({
  name: nameSchema,
  email: z2.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z2.string().min(1, "Please confirm your password")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
var updateProfileSchema = z2.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional()
});
var changePasswordSchema = z2.object({
  currentPassword: z2.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z2.string().min(1, "Please confirm your new password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// src/dto/admin.ts
import { z as z3 } from "zod";
var ADMIN_REQUEST_STATUSES = ["pending", "approved", "rejected"];
var adminRequestsQuerySchema = paginationSchema.extend({
  status: z3.enum(ADMIN_REQUEST_STATUSES).optional()
});
var nameSchema2 = z3.string().trim().min(2, "Name must be at least 2 characters").max(120);
var phoneSchema2 = z3.string().trim().min(6, "Enter a valid phone number").max(25).regex(/^[+]?[0-9 ()-]+$/, "Enter a valid phone number");
var createAdminSchema = z3.object({
  name: nameSchema2,
  email: z3.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: phoneSchema2,
  password: passwordSchema,
  confirmPassword: z3.string().min(1, "Please confirm the password"),
  licenseDurationDays: z3.number({ invalid_type_error: "Select a license duration" }).int("Duration must be a whole number of days").min(1, "Duration must be at least 1 day").max(3650, "Duration cannot exceed 3650 days"),
  maxUsers: z3.number().int().min(0).max(1e6).optional().default(0)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
var updateAdminStatusSchema = z3.object({
  status: z3.enum(["active", "suspended", "inactive"])
});
var resetPasswordSchema = z3.object({
  newPassword: passwordSchema,
  confirmPassword: z3.string().min(1, "Please confirm the new password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
var updateUserStatusSchema = z3.object({
  status: z3.enum(["active", "suspended", "inactive"])
});
var updateAdminSubdomainSchema = z3.object({
  action: z3.enum(["disable", "enable", "regenerate"], {
    errorMap: () => ({ message: "Select a subdomain action" })
  })
});
var approveAdminRequestSchema = z3.object({
  licenseDurationDays: z3.number({ invalid_type_error: "Select a license duration" }).int("Duration must be a whole number of days").min(1, "Duration must be at least 1 day").max(3650, "Duration cannot exceed 3650 days").optional(),
  maxUsers: z3.number().int().min(0).max(1e6).optional()
}).refine((data) => data.licenseDurationDays !== void 0 === (data.maxUsers !== void 0), {
  message: "Max users must be set together with a license duration.",
  path: ["maxUsers"]
});
var rejectAdminRequestSchema = z3.object({
  reason: z3.string().trim().min(1, "Please provide a rejection reason").max(500, "Reason is too long")
});

// src/dto/license.ts
import { z as z4 } from "zod";
var activateLicenseSchema = z4.object({
  licenseKey: z4.string().trim().min(1, "License key is required").max(64)
});
var createLicenseSchema = z4.object({
  adminUserId: z4.string().trim().min(1, "Admin is required"),
  durationDays: z4.number().int().min(1).max(3650),
  maxUsers: z4.number().int().min(0).max(1e6).optional().default(0),
  metadata: z4.record(z4.unknown()).optional().default({})
});
var updateLicenseStatusSchema = z4.object({
  status: z4.enum(["active", "suspended", "revoked", "expired"]),
  reason: z4.string().trim().max(500).optional().default("")
});
var renewLicenseSchema = z4.object({
  durationDays: z4.number().int().min(1).max(3650)
});

// src/dto/catalog.ts
import { z as z5 } from "zod";
var createCategorySchema = z5.object({
  name: z5.string().trim().min(2, "Name must be at least 2 characters").max(80),
  icon: z5.string().trim().max(60).optional().default("grid"),
  status: z5.enum(["active", "inactive"]).optional().default("active"),
  sortOrder: z5.number().int().min(0).max(9999).optional().default(0)
});
var updateCategorySchema = createCategorySchema.partial();
var createServiceSchema = z5.object({
  name: z5.string().trim().min(2, "Name must be at least 2 characters").max(150),
  categoryId: z5.string().trim().min(1, "Category is required"),
  description: z5.string().trim().max(2e3).optional().default(""),
  price: z5.number().positive("Price must be greater than 0"),
  minOrder: z5.number().int().min(1, "Minimum order must be at least 1"),
  maxOrder: z5.number().int().min(1, "Maximum order must be at least 1"),
  status: z5.enum(["active", "inactive"]).optional().default("active")
}).refine((data) => data.maxOrder >= data.minOrder, {
  message: "Maximum order must be greater than or equal to minimum order",
  path: ["maxOrder"]
});
var updateServiceSchema = z5.object({
  name: z5.string().trim().min(2).max(150).optional(),
  categoryId: z5.string().trim().min(1).optional(),
  description: z5.string().trim().max(2e3).optional(),
  price: z5.number().positive().optional(),
  minOrder: z5.number().int().min(1).optional(),
  maxOrder: z5.number().int().min(1).optional(),
  status: z5.enum(["active", "inactive"]).optional()
}).refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });

// src/dto/order.ts
import { z as z6 } from "zod";
var createOrderSchema = z6.object({
  serviceId: z6.string().trim().min(1, "Service is required"),
  link: z6.string().trim().min(4, "Enter a valid link").max(2e3),
  quantity: z6.number().int().min(1, "Quantity must be at least 1").max(1e7)
});
var createBundleOrderSchema = z6.object({
  bundleId: z6.string().trim().min(1, "Bundle is required"),
  link: z6.string().trim().min(4, "Enter a valid link").max(2e3)
});
var updateOrderStatusSchema = z6.object({
  status: z6.enum(["processing", "in_progress", "completed", "partial", "cancelled", "failed"]),
  startCounter: z6.number().int().min(0).optional(),
  remaining: z6.number().int().min(0).optional()
});

// src/dto/wallet.ts
import { z as z7 } from "zod";
var addFundsSchema = z7.object({
  amount: z7.number({ invalid_type_error: "Amount is required" }).positive("Amount must be greater than 0").max(1e6),
  paymentMethodId: z7.string().trim().min(1, "Select a payment method").optional()
});
var createPaymentMethodSchema = z7.object({
  name: z7.string().trim().min(2).max(80),
  code: z7.string().trim().min(2).max(30).regex(/^[a-z0-9_-]+$/, "Code may only contain lowercase letters, numbers, dashes and underscores"),
  enabled: z7.boolean().optional().default(true),
  instructions: z7.string().trim().max(2e3).optional().default(""),
  config: z7.record(z7.unknown()).optional().default({})
});
var updatePaymentMethodSchema = createPaymentMethodSchema.partial();

// src/dto/settings.ts
import { z as z8 } from "zod";
var updateSettingsSchema = z8.object({
  siteName: z8.string().trim().min(1).max(80).optional(),
  youtubeLink: z8.string().trim().max(2e3).optional(),
  telegramLink: z8.string().trim().max(2e3).optional(),
  supportEmail: z8.string().trim().toLowerCase().email().optional(),
  currency: z8.string().trim().min(1).max(10).optional(),
  minDeposit: z8.number().min(0).max(1e6).optional(),
  registrationEnabled: z8.boolean().optional()
});
var upsertSettingSchema = z8.object({
  key: z8.string().trim().min(1).max(100),
  value: z8.unknown()
});
var updateUserThemeSettingsSchema = z8.object({
  theme: z8.enum(PANEL_THEMES, {
    errorMap: () => ({ message: "Select a valid theme" })
  }),
  allowUserOverride: z8.boolean()
});
var updateUserThemeOverrideSchema = z8.object({
  userId: z8.string().trim().min(1, "Select a user"),
  theme: z8.enum(PANEL_THEMES, {
    errorMap: () => ({ message: "Select a valid theme" })
  })
});
var updateOwnThemeOverrideSchema = z8.object({
  theme: z8.enum(PANEL_THEMES, {
    errorMap: () => ({ message: "Select a valid theme" })
  })
});
var updateAdminThemeSettingsSchema = z8.object({
  theme: z8.enum(PANEL_THEMES, {
    errorMap: () => ({ message: "Select a valid theme" })
  }),
  enabledThemes: z8.array(z8.enum(PANEL_THEMES)).min(1, "At least one theme must be enabled").refine((themes) => new Set(themes).size === themes.length, {
    message: "Themes must be unique"
  }),
  defaultTheme: z8.enum(PANEL_THEMES, {
    errorMap: () => ({ message: "Select a valid theme" })
  })
});
var updatePlatformThemeSchema = z8.object({
  theme: z8.enum(PANEL_THEMES, {
    errorMap: () => ({ message: "Select a valid theme" })
  })
});
var updateAdminPanelThemeSchema = z8.object({
  theme: z8.enum(PANEL_THEMES, {
    errorMap: () => ({ message: "Select a valid theme" })
  })
});
var createSubAdminSchema = z8.object({
  name: z8.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z8.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z8.string().trim().min(6, "Enter a valid phone number").max(25).regex(/^[+]?[0-9 ()-]+$/, "Enter a valid phone number"),
  password: z8.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
  confirmPassword: z8.string().min(1, "Please confirm the password"),
  adminScopes: z8.array(z8.enum([ADMIN_SCOPES.MANAGE_USERS, ADMIN_SCOPES.MANAGE_USER_THEME, ADMIN_SCOPES.VIEW_USERS, ADMIN_SCOPES.VIEW_ORDERS])).max(4)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
var updateSubAdminSchema = z8.object({
  adminScopes: z8.array(
    z8.enum([ADMIN_SCOPES.MANAGE_USERS, ADMIN_SCOPES.MANAGE_USER_THEME, ADMIN_SCOPES.VIEW_USERS, ADMIN_SCOPES.VIEW_ORDERS])
  ).max(4)
});
var claimUserSchema = z8.object({
  email: z8.string().trim().toLowerCase().email("Enter a valid email address")
});
var createTenantUserSchema = z8.object({
  name: z8.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z8.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z8.string().trim().min(6, "Enter a valid phone number").max(25).regex(/^[+]?[0-9 ()-]+$/, "Enter a valid phone number"),
  password: z8.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
  confirmPassword: z8.string().min(1, "Please confirm the password")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// src/dto/engagementBundle.ts
import { z as z9 } from "zod";
var ENGAGEMENT_BUNDLE_TYPES = ["likes", "views", "subscribers"];
var ENGAGEMENT_BUNDLE_STATUSES = ["active", "inactive"];
var ENGAGEMENT_BUNDLE_CURRENCIES = ["INR", "USD", "EUR", "GBP"];
var ENGAGEMENT_BUNDLE_TYPE_LABELS = {
  likes: "Likes",
  views: "Views",
  subscribers: "Subscribers"
};
var priceField = z9.number().min(0, "Price must be greater than or equal to 0").max(1e6, "Price is too large").refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, {
  message: "Price must not have more than 2 decimal places"
});
var displayNameField = z9.string().trim().min(2, "Display name must be at least 2 characters").max(150);
var quantityField = z9.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(1e7, "Quantity is too large");
var createEngagementBundleSchema = z9.object({
  type: z9.enum(ENGAGEMENT_BUNDLE_TYPES, {
    message: "Select a valid engagement type"
  }),
  quantity: quantityField,
  price: priceField,
  currency: z9.enum(ENGAGEMENT_BUNDLE_CURRENCIES).optional().default("INR"),
  displayName: displayNameField,
  description: z9.string().trim().max(600).optional().default(""),
  status: z9.enum(ENGAGEMENT_BUNDLE_STATUSES).optional().default("active"),
  sortOrder: z9.number().int().min(0).max(9999).optional().default(0)
});
var updateEngagementBundleSchema = z9.object({
  type: z9.enum(ENGAGEMENT_BUNDLE_TYPES),
  quantity: quantityField,
  price: priceField,
  currency: z9.enum(ENGAGEMENT_BUNDLE_CURRENCIES),
  displayName: displayNameField,
  description: z9.string().trim().max(600),
  status: z9.enum(ENGAGEMENT_BUNDLE_STATUSES),
  sortOrder: z9.number().int().min(0).max(9999)
}).partial().refine((data) => Object.keys(data).length > 0, { message: "No fields to update" });
var updateEngagementBundleStatusSchema = z9.object({
  status: z9.enum(ENGAGEMENT_BUNDLE_STATUSES)
});
var engagementBundlesQuerySchema = paginationSchema.extend({
  type: z9.enum(ENGAGEMENT_BUNDLE_TYPES).optional(),
  status: z9.enum(ENGAGEMENT_BUNDLE_STATUSES).optional()
});
export {
  ACCOUNT_STATUSES,
  ADMIN_REQUEST_STATUSES,
  ADMIN_SCOPES,
  ALL_ADMIN_SCOPES,
  ALL_ROLES,
  API_STATUS,
  AUDIT_ACTIONS,
  AUTH_PROVIDERS,
  ApiError,
  DEFAULT_PANEL_THEME,
  ENGAGEMENT_BUNDLE_CURRENCIES,
  ENGAGEMENT_BUNDLE_STATUSES,
  ENGAGEMENT_BUNDLE_TYPES,
  ENGAGEMENT_BUNDLE_TYPE_LABELS,
  LICENSE_STATUSES,
  ORDER_STATUSES,
  PANEL_THEMES,
  PANEL_THEME_DARK,
  PANEL_THEME_DESCRIPTIONS,
  PANEL_THEME_LABELS,
  PANEL_THEME_SWATCHES,
  PREMIUM_PANEL_THEMES,
  ROLES,
  SUBDOMAIN_SLUG_MAX_LENGTH,
  SUBDOMAIN_STATUSES,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  activateLicenseSchema,
  addFundsSchema,
  adminLoginSchema,
  adminRequestsQuerySchema,
  approveAdminRequestSchema,
  buildSubdomainHost,
  changePasswordSchema,
  claimUserSchema,
  createAdminSchema,
  createBundleOrderSchema,
  createCategorySchema,
  createEngagementBundleSchema,
  createLicenseSchema,
  createOrderSchema,
  createPaymentMethodSchema,
  createServiceSchema,
  createSubAdminSchema,
  createTenantUserSchema,
  engagementBundlesQuerySchema,
  friendlyMessage,
  hasAdminScope,
  hostNameOnly,
  idSchema,
  isAdminScope,
  isPanelTheme,
  isRole,
  isValidSubdomainSlug,
  loginSchema,
  paginated,
  paginationSchema,
  passwordSchema,
  registerSchema,
  rejectAdminRequestSchema,
  renewLicenseSchema,
  resetPasswordSchema,
  slugifySubdomainSlug,
  subdomainSlugFromHost,
  updateAdminPanelThemeSchema,
  updateAdminStatusSchema,
  updateAdminSubdomainSchema,
  updateAdminThemeSettingsSchema,
  updateCategorySchema,
  updateEngagementBundleSchema,
  updateEngagementBundleStatusSchema,
  updateLicenseStatusSchema,
  updateOrderStatusSchema,
  updateOwnThemeOverrideSchema,
  updatePaymentMethodSchema,
  updatePlatformThemeSchema,
  updateProfileSchema,
  updateServiceSchema,
  updateSettingsSchema,
  updateSubAdminSchema,
  updateUserStatusSchema,
  updateUserThemeOverrideSchema,
  updateUserThemeSettingsSchema,
  upsertSettingSchema
};
