import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface WalletRecord {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  currency: string;
  updatedAt: Date;
}

const walletSchema = new Schema<WalletRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    totalDeposited: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD', maxlength: 10 },
  },
  { versionKey: false, timestamps: true },
);

const Wallet =
  (models.Wallet as mongoose.Model<WalletRecord> | undefined) ?? model<WalletRecord>('Wallet', walletSchema);

export default Wallet;