import mongoose from 'mongoose';
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
declare const AuditLog: mongoose.Model<AuditLogRecord, {}, {}, {}, mongoose.Document<unknown, {}, AuditLogRecord, {}, {}> & AuditLogRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default AuditLog;
