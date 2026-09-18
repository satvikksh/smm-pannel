import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface ServiceRecord {
  _id: mongoose.Types.ObjectId;
  name: string;
  categoryId: mongoose.Types.ObjectId;
  description: string;
  price: number;
  minOrder: number;
  maxOrder: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<ServiceRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    description: { type: String, default: '', maxlength: 2000 },
    price: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, required: true, min: 1 },
    maxOrder: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true, versionKey: false },
);

serviceSchema.index({ categoryId: 1, status: 1 });

const Service =
  (models.Service as mongoose.Model<ServiceRecord> | undefined) ??
  model<ServiceRecord>('Service', serviceSchema);

export default Service;