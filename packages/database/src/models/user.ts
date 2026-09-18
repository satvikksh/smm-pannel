import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import type { AccountStatus, AdminScope, AuthProvider, Role, SubdomainStatus } from '@smm/types';

export interface UserRecord {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
  licenseId?: mongoose.Types.ObjectId | null;
  subdomainSlug?: string | null;
  subdomain?: string | null;
  subdomainStatus?: SubdomainStatus | null;
  subdomainCreatedAt?: Date | null;
  /** Owning Main Admin for user-role accounts. Null for self-registered users. */
  adminId?: mongoose.Types.ObjectId | null;
  /** Sub Admin (or Main Admin) the user account is assigned to. */
  assignedTo?: mongoose.Types.ObjectId | null;
  /** Parent Main Admin for Sub Admin accounts (role=admin). */
  parentAdminId?: mongoose.Types.ObjectId | null;
  /** Capabilities granted to Sub Admin accounts. */
  adminScopes?: AdminScope[];
  /** Google platform user id when this account is Google-linked. Null otherwise. */
  googleId?: string | null;
  /** Authentication provider(s) used by this account. */
  authProvider?: AuthProvider;
  /** Profile image url from the identity provider, when available. */
  profileImage?: string | null;
  /** True when the identity provider confirmed the account email. */
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    // Only password-based (local) accounts own a phone + password. Google users
    // store an empty sentinel instead, so the required guards are conditional.
    phone: {
      type: String,
      trim: true,
      required: function (this: UserRecord) {
        return (this.authProvider ?? 'local') !== 'google';
      },
    },
    passwordHash: {
      type: String,
      required: function (this: UserRecord) {
        return (this.authProvider ?? 'local') !== 'google';
      },
    },
    role: { type: String, required: true, enum: ['super_admin', 'admin', 'user'], index: true },
    status: {
      type: String,
      required: true,
      enum: ['active', 'suspended', 'inactive', 'deleted'],
      default: 'active',
      index: true,
    },
    licenseId: { type: Schema.Types.ObjectId, ref: 'License', default: null },
    subdomainSlug: { type: String, default: null },
    subdomain: { type: String, default: null },
    subdomainStatus: { type: String, enum: ['active', 'disabled'], default: null },
    subdomainCreatedAt: { type: Date, default: null },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    parentAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    adminScopes: {
      type: [String],
      enum: ['manageUsers', 'manageUserTheme', 'viewUsers', 'viewOrders'],
      default: undefined,
    },
    googleId: { type: String, default: null, trim: true },
    authProvider: { type: String, enum: ['local', 'google', 'local/google'], default: 'local' },
    profileImage: { type: String, default: null, trim: true, maxlength: 700 },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ role: 1, adminId: 1 });
userSchema.index({ role: 1, parentAdminId: 1 });
// Subdomain slugs are globally unique among admins. Partial filter keeps the
// unique index from clashing on the null default stored on non-admin users.
userSchema.index(
  { subdomainSlug: 1 },
  { unique: true, partialFilterExpression: { subdomainSlug: { $type: 'string' }, role: 'admin' } },
);
// Google ids are globally unique across user accounts. Partial filter keeps
// the index clear of the null default on local-only accounts.
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
);

const User =
  (models.User as mongoose.Model<UserRecord> | undefined) ?? model<UserRecord>('User', userSchema);

export default User;