import mongoose from 'mongoose';
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
declare const Session: mongoose.Model<SessionRecord, {}, {}, {}, mongoose.Document<unknown, {}, SessionRecord, {}, {}> & SessionRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Session;
