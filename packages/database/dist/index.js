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
      enum: ["active", "suspended", "inactive", "deleted", "pending", "rejected"],
      default: "active",
      index: true
    },
    licenseId: { type: Schema.Types.ObjectId, ref: "License", default: null },
    subdomainSlug: { type: String, default: null },
    subdomain: { type: String, default: null },
    subdomainStatus: { type: String, enum: ["active", "disabled"], default: null },
    subdomainCreatedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null, trim: true, maxlength: 500 },
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

// src/models/engagementBundle.ts
import mongoose6 from "mongoose";
var { Schema: Schema5, model: model5, models: models5 } = mongoose6;
var engagementBundleSchema = new Schema5(
  {
    type: { type: String, enum: ["likes", "views", "subscribers"], required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true, default: "INR" },
    displayName: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: "", trim: true, maxlength: 600 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    sortOrder: { type: Number, default: 0, min: 0, max: 9999 },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true, versionKey: false }
);
engagementBundleSchema.pre("validate", function(next) {
  if (Number.isFinite(this.price)) {
    this.price = Math.round(this.price * 100) / 100;
  }
  if (Number.isFinite(this.quantity)) {
    this.quantity = Math.round(this.quantity);
  }
  next();
});
engagementBundleSchema.index(
  { type: 1, quantity: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
engagementBundleSchema.index({ type: 1, sortOrder: 1, quantity: 1 });
var EngagementBundle = models5.EngagementBundle ?? model5("EngagementBundle", engagementBundleSchema);
var engagementBundle_default = EngagementBundle;

// src/models/order.ts
import mongoose7 from "mongoose";
var { Schema: Schema6, model: model6, models: models6 } = mongoose7;
var orderSchema = new Schema6(
  {
    userId: { type: Schema6.Types.ObjectId, ref: "User", required: true, index: true },
    serviceId: { type: Schema6.Types.ObjectId, ref: "Service", required: true, index: true },
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
    remaining: { type: Number, default: 0, min: 0 },
    bundleId: { type: Schema6.Types.ObjectId, ref: "EngagementBundle", default: null, index: true },
    bundleType: { type: String, enum: ["likes", "views", "subscribers"], default: null },
    currency: { type: String, default: null, trim: true }
  },
  { timestamps: true, versionKey: false }
);
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
var Order = models6.Order ?? model6("Order", orderSchema);
var order_default = Order;

// src/models/transaction.ts
import mongoose8 from "mongoose";
var { Schema: Schema7, model: model7, models: models7 } = mongoose8;
var transactionSchema = new Schema7(
  {
    userId: { type: Schema7.Types.ObjectId, ref: "User", required: true, index: true },
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
var Transaction = models7.Transaction ?? model7("Transaction", transactionSchema);
var transaction_default = Transaction;

// src/models/wallet.ts
import mongoose9 from "mongoose";
var { Schema: Schema8, model: model8, models: models8 } = mongoose9;
var walletSchema = new Schema8(
  {
    userId: { type: Schema8.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    totalDeposited: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "USD", maxlength: 10 }
  },
  { versionKey: false, timestamps: true }
);
var Wallet = models8.Wallet ?? model8("Wallet", walletSchema);
var wallet_default = Wallet;

// src/models/paymentMethod.ts
import mongoose10 from "mongoose";
var { Schema: Schema9, model: model9, models: models9 } = mongoose10;
var paymentMethodSchema = new Schema9(
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
    config: { type: mongoose10.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true, versionKey: false }
);
var PaymentMethod = models9.PaymentMethod ?? model9("PaymentMethod", paymentMethodSchema);
var paymentMethod_default = PaymentMethod;

// src/models/platformSetting.ts
import mongoose11 from "mongoose";
var { Schema: Schema10, model: model10, models: models10 } = mongoose11;
var platformSettingSchema = new Schema10(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 100 },
    value: { type: mongoose11.Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema10.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, versionKey: false }
);
var PlatformSetting = models10.PlatformSetting ?? model10("PlatformSetting", platformSettingSchema);
var platformSetting_default = PlatformSetting;

// src/models/auditLog.ts
import mongoose12 from "mongoose";
var { Schema: Schema11, model: model11, models: models11 } = mongoose12;
var auditLogSchema = new Schema11(
  {
    actorId: { type: Schema11.Types.ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, default: "" },
    actorRole: { type: String, enum: ["super_admin", "admin", "user", "system"], default: "system", index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: "" },
    targetId: { type: String, default: "", index: true },
    targetLabel: { type: String, default: "" },
    result: { type: String, enum: ["success", "failure"], default: "success" },
    ip: { type: String, default: "" },
    metadata: { type: mongoose12.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: false, versionKey: false }
);
auditLogSchema.index({ createdAt: -1 });
var AuditLog = models11.AuditLog ?? model11("AuditLog", auditLogSchema);
var auditLog_default = AuditLog;

// src/models/session.ts
import mongoose13 from "mongoose";
var { Schema: Schema12, model: model12, models: models12 } = mongoose13;
var sessionSchema = new Schema12(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema12.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["super_admin", "admin", "user"], required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);
sessionSchema.index({ userId: 1, revokedAt: 1 });
var Session = models12.Session ?? model12("Session", sessionSchema);
var session_default = Session;

// src/models/userThemeSettings.ts
import mongoose14 from "mongoose";
import {
  DEFAULT_PANEL_THEME,
  PANEL_THEMES,
  isPanelTheme
} from "@smm/types";
var { Schema: Schema13, model: model13, models: models13 } = mongoose14;
var userThemeSettingsSchema = new Schema13(
  {
    _id: { type: String, required: true },
    theme: {
      type: String,
      enum: PANEL_THEMES,
      required: true,
      default: DEFAULT_PANEL_THEME
    },
    allowUserOverride: { type: Boolean, required: true, default: false },
    updatedBy: { type: Schema13.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, versionKey: false, _id: false }
);
var UserThemeSettings = models13.UserThemeSettings ?? model13("UserThemeSettings", userThemeSettingsSchema);
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
import mongoose15 from "mongoose";
import {
  DEFAULT_PANEL_THEME as DEFAULT_PANEL_THEME2,
  PANEL_THEMES as PANEL_THEMES2,
  isPanelTheme as isPanelTheme2
} from "@smm/types";
var { Schema: Schema14, model: model14, models: models14 } = mongoose15;
var userThemePreferenceSchema = new Schema14(
  {
    _id: { type: String, required: true },
    theme: {
      type: String,
      enum: PANEL_THEMES2,
      required: true,
      default: DEFAULT_PANEL_THEME2
    },
    updatedBy: { type: Schema14.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, versionKey: false, _id: false }
);
var UserThemePreference = models14.UserThemePreference ?? model14("UserThemePreference", userThemePreferenceSchema);
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
import mongoose16 from "mongoose";
import {
  DEFAULT_PANEL_THEME as DEFAULT_PANEL_THEME3,
  PANEL_THEMES as PANEL_THEMES3,
  isPanelTheme as isPanelTheme3
} from "@smm/types";
var { Schema: Schema15, model: model15, models: models15 } = mongoose16;
var adminThemeSettingsSchema = new Schema15(
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
    updatedBy: { type: Schema15.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true, versionKey: false, _id: false }
);
var AdminThemeSettings = models15.AdminThemeSettings ?? model15("AdminThemeSettings", adminThemeSettingsSchema);
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

// src/platformTheme.ts
import {
  DEFAULT_PANEL_THEME as DEFAULT_PANEL_THEME5,
  ROLES,
  isPanelTheme as isPanelTheme4
} from "@smm/types";
var PLATFORM_THEME_KEY = "platformTheme";
function normalizePlatformTheme(value) {
  return isPanelTheme4(value) ? value : DEFAULT_PANEL_THEME5;
}
async function getPlatformTheme() {
  const doc = await platformSetting_default.findOne({ key: PLATFORM_THEME_KEY }).lean();
  return normalizePlatformTheme(doc?.value);
}
async function getPlatformThemeMeta() {
  const doc = await platformSetting_default.findOne({ key: PLATFORM_THEME_KEY }).lean();
  return {
    theme: normalizePlatformTheme(doc?.value),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    updatedBy: doc?.updatedBy ? String(doc.updatedBy) : null
  };
}
async function setPlatformTheme(theme, updatedBy) {
  await platformSetting_default.updateOne(
    { key: PLATFORM_THEME_KEY },
    { $set: { value: theme, updatedBy } },
    { upsert: true }
  );
  const admins = await user_default.find({ role: ROLES.ADMIN, parentAdminId: { $in: [null, void 0] } }).select("_id").lean();
  await Promise.all(
    admins.map(async (admin) => {
      const adminId = String(admin._id);
      await Promise.all([
        adminThemeSettings_default.findByIdAndUpdate(
          adminId,
          { $set: { theme, updatedBy } },
          { upsert: true, new: true }
        ),
        userThemeSettings_default.findByIdAndUpdate(
          adminId,
          { $set: { theme, updatedBy } },
          { upsert: true, new: true }
        )
      ]);
    })
  );
  return theme;
}
export {
  adminThemeSettings_default as AdminThemeSettings,
  auditLog_default as AuditLog,
  category_default as Category,
  engagementBundle_default as EngagementBundle,
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
  getPlatformTheme,
  getPlatformThemeMeta,
  getUserThemePreference,
  getUserThemeSettings,
  isConnected,
  mongoose,
  resolveUserPanelTheme,
  setAdminThemeSettings,
  setPlatformTheme,
  setUserThemePreference,
  setUserThemeSettings,
  tenantAllowedThemes
};
