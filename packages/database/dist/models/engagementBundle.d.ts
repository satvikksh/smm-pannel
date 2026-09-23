import mongoose from 'mongoose';
import type { EngagementBundleStatus, EngagementBundleType } from '@smm/types';
export interface EngagementBundleRecord {
    _id: mongoose.Types.ObjectId;
    type: EngagementBundleType;
    quantity: number;
    price: number;
    currency: string;
    displayName: string;
    description: string;
    status: EngagementBundleStatus;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
declare const EngagementBundle: mongoose.Model<EngagementBundleRecord, {}, {}, {}, mongoose.Document<unknown, {}, EngagementBundleRecord, {}, {}> & EngagementBundleRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default EngagementBundle;
