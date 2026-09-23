import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
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

const engagementBundleSchema = new Schema<EngagementBundleRecord>(
  {
    type: { type: String, enum: ['likes', 'views', 'subscribers'], required: true, index: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true, default: 'INR' },
    displayName: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', trim: true, maxlength: 600 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    sortOrder: { type: Number, default: 0, min: 0, max: 9999 },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, versionKey: false },
);

/** Round money to 2 decimals at write time so no floating-point drift is stored. */
engagementBundleSchema.pre('validate', function (this: EngagementBundleRecord, next) {
  if (Number.isFinite(this.price)) {
    this.price = Math.round(this.price * 100) / 100;
  }
  if (Number.isFinite(this.quantity)) {
    this.quantity = Math.round(this.quantity);
  }
  next();
});

/** (type, quantity) is unique among bundles that are not archived. */
engagementBundleSchema.index(
  { type: 1, quantity: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
engagementBundleSchema.index({ type: 1, sortOrder: 1, quantity: 1 });

const EngagementBundle =
  (models.EngagementBundle as mongoose.Model<EngagementBundleRecord> | undefined) ??
  model<EngagementBundleRecord>('EngagementBundle', engagementBundleSchema);

export default EngagementBundle;