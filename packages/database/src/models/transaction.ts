import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;
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

const transactionSchema = new Schema<TransactionRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit', 'refund'], required: true },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'completed',
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, default: 0 },
    reference: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
);

transactionSchema.index({ userId: 1, createdAt: -1 });

const Transaction =
  (models.Transaction as mongoose.Model<TransactionRecord> | undefined) ??
  model<TransactionRecord>('Transaction', transactionSchema);

export default Transaction;