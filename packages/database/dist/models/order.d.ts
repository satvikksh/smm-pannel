import mongoose from 'mongoose';
import type { OrderStatus } from '@smm/types';
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
    createdAt: Date;
    updatedAt: Date;
}
declare const Order: mongoose.Model<OrderRecord, {}, {}, {}, mongoose.Document<unknown, {}, OrderRecord, {}, {}> & OrderRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Order;
