import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
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

const licenseSchema = new Schema<LicenseRecord>(
  {
    licenseKey: { type: String, required: true, unique: true, index: true, trim: true },
    adminUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['active', 'suspended', 'revoked', 'expired'],
      default: 'active',
      index: true,
    },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    maxUsers: { type: Number, default: 0, min: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    history: {
      type: [
        {
          status: { type: String, enum: ['active', 'suspended', 'revoked', 'expired'], required: true },
          at: { type: Date, required: true },
          by: { type: Schema.Types.ObjectId, ref: 'User' },
          reason: { type: String },
        },
      ],
      default: [],
    },
  },
  { timestamps: true, versionKey: false },
);

const License =
  (models.License as mongoose.Model<LicenseRecord> | undefined) ??
  model<LicenseRecord>('License', licenseSchema);

export default License;