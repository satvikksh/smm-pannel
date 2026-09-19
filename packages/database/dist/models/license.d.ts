import mongoose from 'mongoose';
import type { LicenseStatus } from '@smm/types';
export interface LicenseHistoryEntry {
    status: LicenseStatus;
    at: Date;
    by?: mongoose.Types.ObjectId;
    reason?: string;
}
export interface LicenseRecord {
    _id: mongoose.Types.ObjectId;
    licenseKey: string;
    adminUserId: mongoose.Types.ObjectId;
    status: LicenseStatus;
    issuedAt: Date;
    expiresAt: Date;
    createdBy: mongoose.Types.ObjectId;
    maxUsers: number;
    metadata: Record<string, unknown>;
    history: LicenseHistoryEntry[];
    createdAt: Date;
    updatedAt: Date;
}
declare const License: mongoose.Model<LicenseRecord, {}, {}, {}, mongoose.Document<unknown, {}, LicenseRecord, {}, {}> & LicenseRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default License;
