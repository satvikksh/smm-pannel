import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
import type { Role } from '@smm/types';

export interface AuditLogRecord {
  _id: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId | null;
  actorName: string;
  actorRole: Role | 'system';
  action: string;
  targetType: string;
  targetId: string;
  targetLabel: string;
  result: 'success' | 'failure';
  ip: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogRecord>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: '' },
    actorRole: { type: String, enum: ['super_admin', 'admin', 'user', 'system'], default: 'system', index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: '' },
    targetId: { type: String, default: '', index: true },
    targetLabel: { type: String, default: '' },
    result: { type: String, enum: ['success', 'failure'], default: 'success' },
    ip: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog =
  (models.AuditLog as mongoose.Model<AuditLogRecord> | undefined) ??
  model<AuditLogRecord>('AuditLog', auditLogSchema);

export default AuditLog;