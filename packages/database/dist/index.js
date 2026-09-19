// src/connect.ts
import mongoose from "mongoose";
async function connectDatabase(uri) {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 1e4
  });
}
async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
function isConnected() {
  return mongoose.connection.readyState === 1;
}

// src/models/user.ts
import mongoose2 from "mongoose";
var { Schema, model, models } = mongoose2;
var userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    // Only password-based (local) accounts own a phone + password. Google users
    // store an empty sentinel instead, so the required guards are conditional.
    phone: {
      type: String,
      trim: true,
      required: function() {
        return (this.authProvider ?? "local") !== "google";
      }
    },
    passwordHash: {
      type: String,
      required: function() {
        return (this.authProvider ?? "local") !== "google";
      }
    },
    role: { type: String, required: true, enum: ["super_admin", "admin", "user"], index: true },
    status: {
      type: String,
      required: true,
      enum: ["active", "suspended", "inactive", "deleted"],
      default: "active",
      index: true
    },
    licenseId: { type: Schema.Types.ObjectId, ref: "License", default: null },
    subdomainSlug: { type: String, default: null },
    subdomain: { type: String, default: null },
    subdomainStatus: { type: String, enum: ["active", "disabled"], default: null },
    subdomainCreatedAt: { type: Date, default: null },
    adminId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    parentAdminId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    adminScopes: {
      type: [String],
      enum: ["manageUsers", "manageUserTheme", "viewUsers", "viewOrders"],
      default: void 0
    },
    googleId: { type: String, default: null, trim: true },
    authProvider: { type: String, enum: ["local", "google", "local/google"], default: "local" },
    profileImage: { type: String, default: null, trim: true, maxlength: 700 },
    emailVerified: { type: Boolean, default: false }
  },
  { timestamps: true, versionKey: false }
);
userSchema.index({ role: 1, status: 1 });
userSchema.index({ role: 1, adminId: 1 });
userSchema.index({ role: 1, parentAdminId: 1 });
userSchema.index(
  { subdomainSlug: 1 },
  { unique: true, partialFilterExpression: { subdomainSlug: { $type: "string" }, role: "admin" } }
);
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: "string" } } }
);
var User = models.User ?? model("User", userSchema);
var user_default = User;

// src/models/license.ts
import mongoose3 from "mongoose";
var { Schema: Schema2, model: model2, models: models2 } = mongoose3;
var licenseSchema = new Schema2(
  {
    licenseKey: { type: String, required: true, unique: true, index: true, trim: true },
    adminUserId: { type: Schema2.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["active", "suspended", "revoked", "expired"],
      default: "active",
      index: true
    },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    createdBy: { type: Schema2.Types.ObjectId, ref: "User", required: true },
    maxUsers: { type: Number, default: 0, min: 0 },
    metadata: { type: mongoose3.Schema.Types.Mixed, default: {} },
    history: {
      type: [
        {
          status: { type: String, enum: ["active", "suspended", "revoked", "expired"], required: true },
          at: { type: Date, required: true },
          by: { type: Schema2.Types.ObjectId, ref: "User" },
          reason: { type: String }
        }
      ],
      default: []
    }
  },
  { timestamps: true, versionKey: false }
);
var License = models2.License ?? model2("License", licenseSchema);
var license_default = License;

// src/models/category.ts
import mongoose4 from "mongoose";
var { Schema: Schema3, model: model3, models: models3 } = mongoose4;
var categorySchema = new Schema3(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    icon: { type: String, default: "grid" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    sortOrder: { type: Number, default: 0, min: 0, max: 9999 }
  },
  { timestamps: true, versionKey: false }
);
var Category = models3.Category ?? model3("Category", categorySchema);
var category_default = Category;

// src/models/service.ts
import mongoose5 from "mongoose";
var { Schema: Schema4, model: model4, models: models4 } = mongoose5;
var serviceSchema = new Schema4(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    categoryId: { type: Schema4.Types.ObjectId, ref: "Category", required: true, index: true },
    description: { type: String, default: "", maxlength: 2e3 },
    price: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, required: true, min: 1 },
    maxOrder: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true }
  },
  { timestamps: true, versionKey: false }
);
serviceSchema.index({ categoryId: 1, status: 1 });
var Service = models4.Service ?? model4("Service", serviceSchema);
var service_default = Service;

// src/models/order.ts
import mongoose6 from "mongoose";
var { Schema: Schema5, model: model5, models: models5 } = mongoose6;
var orderSchema = new Schema5(
  {
    userId: { type: Schema5.Types.ObjectId, ref: "User", required: true, index: true },
    serviceId: { type: Schema5.Types.ObjectId, ref: "Service", required: true, index: true },
    serviceName: { type: String, required: true, trim: true },
    categoryName: { type: String, default: "", trim: true },
    link: { type: String, required: true, trim: true, maxlength: 2e3 },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "processing", "in_progress", "completed", "partial", "cancelled", "failed"],
      default: "pending",
      index: true
    },
    startCounter: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, versionKey: false }
);
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
var Order = models5.Order ?? model5("Order", orderSchema);
var order_default = Order;

// src/models/transaction.ts
import mongoose7 from "mongoose";
var { Schema: Schema6, model: model6, models: models6 } = mongoose7;
var transactionSchema = new Schema6(
  {
    userId: { type: Schema6.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["credit", "debit", "refund"], required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "completed",
      index: true
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, default: 0 },
    reference: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" }
  },
  { timestamps: true, versionKey: false }
);
transactionSchema.index({ userId: 1, createdAt: -1 });
var Transaction = models6.Transaction ?? model6("Transaction", transactionSchema);
var transaction_default = Transaction;

// src/models/wallet.ts
import mongoose8 from "mongoose";
var { Schema: Schema7, model: model7, models: models7 } = mongoose8;
var walletSchema = new Schema7(
  {
    userId: { type: Schema7.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    totalDeposited: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD", maxlength: 10 }
  },
  { versionKey: false, timestamps: true }
);
var Wallet = models7.Wallet ?? model7("Wallet", walletSchema);
var wallet_default = Wallet;

// src/models/paymentMethod.ts
import mongoose9 from "mongoose";
var { Schema: Schema8, model: model8, models: models8 } = mongoose9;
var paymentMethodSchema = new Schema8(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      maxlength: 30
    },
    enabled: { type: Boolean, default: true },
    instructions: { type: String, default: "", maxlength: 2e3 },
    config: { type: mongoose9.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, versionKey: false }
);
var PaymentMethod = models8.PaymentMethod ?? model8("PaymentMethod", paymentMethodSchema);
var paymentMethod_default = PaymentMethod;

// src/models/platformSetting.ts
import mongoose10 from "mongoose";
var { Schema: Schema9, model: model9, models: models9 } = mongoose10;
var platformSettingSchema = new Schema9(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 100 },
    value: { type: mongoose10.Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema9.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, versionKey: false }
);
var PlatformSetting = models9.PlatformSetting ?? model9("PlatformSetting", platformSettingSchema);
var platformSetting_default = PlatformSetting;

// src/models/auditLog.ts
import mongoose11 from "mongoose";
var { Schema: Schema10, model: model10, models: models10 } = mongoose11;
var auditLogSchema = new Schema10(
  {
    actorId: { type: Schema10.Types.ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, default: "" },
    actorRole: { type: String, enum: ["super_admin", "admin", "user", "system"], default: "system", index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: "" },
    targetId: { type: String, default: "", index: true },
    targetLabel: { type: String, default: "" },
    result: { type: String, enum: ["success", "failure"], default: "success" },
    ip: { type: String, default: "" },
    metadata: { type: mongoose11.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: false, versionKey: false }
);
auditLogSchema.index({ createdAt: -1 });
var AuditLog = models10.AuditLog ?? model10("AuditLog", auditLogSchema);
var auditLog_default = AuditLog;

// src/models/session.ts
import mongoose12 from "mongoose";
var { Schema: Schema11, model: model11, models: models11 } = mongoose12;
var sessionSchema = new Schema11(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema11.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["super_admin", "admin", "user"], required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);
sessionSchema.index({ userId: 1, revokedAt: 1 });
var Session = models11.Session ?? model11("Session", sessionSchema);
var session_default = Session;

// src/models/userThemeSettings.ts
import mongoose13 from "mongoose";
import {
  DEFAULT_PANEL_THEME,
  PANEL_THEMES,
  isPanelTheme
} from "@smm/types";
var { Schema: Schema12, model: model12, models: models12 } = mongoose13;
var userThemeSettingsSchema = new Schema12(
  {
    _id: { type: String, required: true },
    theme: {
      type: String,
      enum: PANEL_THEMES,
      required: true,
      default: DEFAULT_PANEL_THEME
    },
    allowUserOverride: { type: Boolean, required: true, default: false },
    updatedBy: { type: Schema12.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, versionKey: false, _id: false }
);
var UserThemeSettings = models12.UserThemeSettings ?? model12("UserThemeSettings", userThemeSettingsSchema);
async function getUserThemeSettings(adminId) {
  const doc = await UserThemeSettings.findById(String(adminId)).lean();
  if (!doc) {
    return { theme: DEFAULT_PANEL_THEME, allowUserOverride: false, updatedBy: null, updatedAt: null };
  }
  return {
    theme: isPanelTheme(doc.theme) ? doc.theme : DEFAULT_PANEL_THEME,
    allowUserOverride: doc.allowUserOverride,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null
  };
}
async function setUserThemeSettings(adminId, value, updatedBy) {
  await UserThemeSettings.findByIdAndUpdate(
    String(adminId),
    { $set: { theme: value.theme, allowUserOverride: value.allowUserOverride, updatedBy } },
    { upsert: true, new: true }
  );
}
var userThemeSettings_default = UserThemeSettings;

// src/models/userThemePreference.ts
import mongoose14 from "mongoose";
import {
  DEFAULT_PANEL_THEME as DEFAULT_PANEL_THEME2,
  PANEL_THEMES as PANEL_THEMES2,
  isPanelTheme as isPanelTheme2
} from "@smm/types";
var { Schema: Schema13, model: model13, models: models13 } = mongoose14;
var userThemePreferenceSchema = new Schema13(
  {
    _id: { type: String, required: true },
    theme: {
      type: String,
      enum: PANEL_THEMES2,
      required: true,
      default: DEFAULT_PANEL_THEME2
    },
    updatedBy: { type: Schema13.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, versionKey: false, _id: false }
);
var UserThemePreference = models13.UserThemePreference ?? model13("UserThemePreference", userThemePreferenceSchema);
async function getUserThemePreference(userId) {
  const doc = await UserThemePreference.findById(String(userId)).lean();
  if (!doc) return null;
  return {
    theme: isPanelTheme2(doc.theme) ? doc.theme : DEFAULT_PANEL_THEME2,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null
  };
}
async function setUserThemePreference(userId, theme, updatedBy) {
  await UserThemePreference.findByIdAndUpdate(
    String(userId),
    { $set: { theme, updatedBy } },
    { upsert: true, new: true }
  );
}
async function clearUserThemePreference(userId) {
  await UserThemePreference.findByIdAndDelete(String(userId));
}
var userThemePreference_default = UserThemePreference;

// src/models/adminThemeSettings.ts
import mongoose15 from "mongoose";
import {
  DEFAULT_PANEL_THEME as DEFAULT_PANEL_THEME3,
  PANEL_THEMES as PANEL_THEMES3,
  isPanelTheme as isPanelTheme3
} from "@smm/types";
var { Schema: Schema14, model: model14, models: models14 } = mongoose15;
var adminThemeSettingsSchema = new Schema14(
  {
    _id: { type: String, required: true },
    theme: {
      type: String,
      enum: PANEL_THEMES3,
      required: true,
      default: DEFAULT_PANEL_THEME3
    },
    enabledThemes: {
      type: [String],
      enum: PANEL_THEMES3,
      required: true,
      default: [...PANEL_THEMES3]
    },
    defaultTheme: {
      type: String,
      enum: PANEL_THEMES3,
      required: true,
      default: DEFAULT_PANEL_THEME3
    },
    updatedBy: { type: Schema14.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, versionKey: false, _id: false }
);
var AdminThemeSettings = models14.AdminThemeSettings ?? model14("AdminThemeSettings", adminThemeSettingsSchema);
async function getAdminThemeSettings(adminId) {
  const doc = await AdminThemeSettings.findById(String(adminId)).lean();
  if (!doc) {
    return {
      theme: DEFAULT_PANEL_THEME3,
      enabledThemes: [...PANEL_THEMES3],
      defaultTheme: DEFAULT_PANEL_THEME3,
      updatedBy: null,
      updatedAt: null
    };
  }
  return {
    theme: isPanelTheme3(doc.theme) ? doc.theme : DEFAULT_PANEL_THEME3,
    enabledThemes: doc.enabledThemes.every(isPanelTheme3) ? [...doc.enabledThemes] : [...PANEL_THEMES3],
    defaultTheme: isPanelTheme3(doc.defaultTheme) ? doc.defaultTheme : DEFAULT_PANEL_THEME3,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null
  };
}
async function setAdminThemeSettings(adminId, value, updatedBy) {
  await AdminThemeSettings.findByIdAndUpdate(
    String(adminId),
    {
      $set: {
        theme: value.theme,
        enabledThemes: value.enabledThemes,
        defaultTheme: value.defaultTheme,
        updatedBy
      }
    },
    { upsert: true, new: true }
  );
}
var adminThemeSettings_default = AdminThemeSettings;

// src/theme.ts
import { DEFAULT_PANEL_THEME as DEFAULT_PANEL_THEME4 } from "@smm/types";
async function resolveUserPanelTheme(user) {
  const tenantAdminId = user.adminId ? String(user.adminId) : null;
  if (!tenantAdminId) {
    return {
      theme: DEFAULT_PANEL_THEME4,
      allowUserOverride: false,
      overrideApplied: false,
      source: "default",
      tenantAdminId: null
    };
  }
  const adminConfig = await getAdminThemeSettings(tenantAdminId);
  const allowedThemes = new Set(adminConfig.enabledThemes);
  const tenant = await getUserThemeSettings(tenantAdminId);
  let theme = allowedThemes.has(tenant.theme) ? tenant.theme : adminConfig.defaultTheme;
  let source = "tenant";
  let overrideApplied = false;
  if (tenant.allowUserOverride) {
    const pref = await getUserThemePreference(String(user._id));
    if (pref && allowedThemes.has(pref.theme)) {
      theme = pref.theme;
      source = "override";
      overrideApplied = true;
    }
  }
  return {
    theme,
    allowUserOverride: tenant.allowUserOverride,
    overrideApplied,
    source,
    tenantAdminId
  };
}
function tenantAllowedThemes(adminConfig) {
  return [.../* @__PURE__ */ new Set([...adminConfig.enabledThemes, adminConfig.defaultTheme])];
}
export {
  adminThemeSettings_default as AdminThemeSettings,
  auditLog_default as AuditLog,
  category_default as Category,
  license_default as License,
  order_default as Order,
  paymentMethod_default as PaymentMethod,
  platformSetting_default as PlatformSetting,
  service_default as Service,
  session_default as Session,
  transaction_default as Transaction,
  user_default as User,
  userThemePreference_default as UserThemePreference,
  userThemeSettings_default as UserThemeSettings,
  wallet_default as Wallet,
  clearUserThemePreference,
  connectDatabase,
  disconnectDatabase,
  getAdminThemeSettings,
  getUserThemePreference,
  getUserThemeSettings,
  isConnected,
  mongoose,
  resolveUserPanelTheme,
  setAdminThemeSettings,
  setUserThemePreference,
  setUserThemeSettings,
  tenantAllowedThemes
};
