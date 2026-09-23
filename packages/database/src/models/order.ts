import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
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

const orderSchema = new Schema<OrderRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    serviceName: { type: String, required: true, trim: true },
    categoryName: { type: String, default: '', trim: true },
    link: { type: String, required: true, trim: true, maxlength: 2000 },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'in_progress', 'completed', 'partial', 'cancelled', 'failed'],
      default: 'pending',
      index: true,
    },
    startCounter: { type: Number, default: 0, min: 0 },
    remaining: { type: Number, default: 0, min: 0 },
    bundleId: { type: Schema.Types.ObjectId, ref: 'EngagementBundle', default: null, index: true },
    bundleType: { type: String, enum: ['likes', 'views', 'subscribers'], default: null },
    currency: { type: String, default: null, trim: true },
  },
  { timestamps: true, versionKey: false },
);

orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

const Order =
  (models.Order as mongoose.Model<OrderRecord> | undefined) ?? model<OrderRecord>('Order', orderSchema);

export default Order;