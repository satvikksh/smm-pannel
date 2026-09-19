import mongoose from 'mongoose';
import type { TransactionStatus, TransactionType } from '@smm/types';
export interface TransactionRecord {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: TransactionType;
    status: TransactionStatus;
    amount: number;
    balanceAfter: number;
    reference: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const Transaction: mongoose.Model<TransactionRecord, {}, {}, {}, mongoose.Document<unknown, {}, TransactionRecord, {}, {}> & TransactionRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Transaction;
