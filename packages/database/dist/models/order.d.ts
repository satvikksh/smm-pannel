import mongoose from 'mongoose';
import type { EngagementBundleType, OrderStatus } from '@smm/types';
export interface OrderRecord {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    serviceId: mongoose.Types.ObjectId;
    serviceName: string;
    categoryName: string;
    link: string;
    quantity: number;
    price: number;
    status: OrderStatus;
    startCounter: number;
    remaining: number;
    /** Engagement bundle that priced this order (null for catalog services). */
    bundleId: mongoose.Types.ObjectId | null;
    bundleType: EngagementBundleType | null;
    currency: string | null;
    createdAt: Date;
    updatedAt: Date;
}
declare const Order: mongoose.Model<OrderRecord, {}, {}, {}, mongoose.Document<unknown, {}, OrderRecord, {}, {}> & OrderRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Order;
