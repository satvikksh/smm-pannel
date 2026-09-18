import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface PaymentMethodRecord {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  enabled: boolean;
  instructions: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodSchema = new Schema<PaymentMethodRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
      maxlength: 30,
    },
    enabled: { type: Boolean, default: true },
    instructions: { type: String, default: '', maxlength: 2000 },
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

const PaymentMethod =
  (models.PaymentMethod as mongoose.Model<PaymentMethodRecord> | undefined) ??
  model<PaymentMethodRecord>('PaymentMethod', paymentMethodSchema);

export default PaymentMethod;