import mongoose from 'mongoose';
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
    /** Super Admin (reviewer) who decided this admin registration, when decided. */
    approvedBy?: mongoose.Types.ObjectId | null;
    /** When the Super Admin approved or rejected this admin registration. */
    approvedAt?: Date | null;
    /** Reason a Super Admin rejected this admin registration. */
    rejectionReason?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
declare const User: mongoose.Model<UserRecord, {}, {}, {}, mongoose.Document<unknown, {}, UserRecord, {}, {}> & UserRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default User;
