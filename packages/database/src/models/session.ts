import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import type { Role } from '@smm/types';

export interface SessionRecord {
  _id: mongoose.Types.ObjectId;
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  role: Role;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionRecord>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['super_admin', 'admin', 'user'], required: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });

const Session =
  (models.Session as mongoose.Model<SessionRecord> | undefined) ?? model<SessionRecord>('Session', sessionSchema);

export default Session;