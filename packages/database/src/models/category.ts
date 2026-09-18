import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface CategoryRecord {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  icon: string;
  status: 'active' | 'inactive';
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<CategoryRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    icon: { type: String, default: 'grid' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    sortOrder: { type: Number, default: 0, min: 0, max: 9999 },
  },
  { timestamps: true, versionKey: false },
);

const Category =
  (models.Category as mongoose.Model<CategoryRecord> | undefined) ??
  model<CategoryRecord>('Category', categorySchema);

export default Category;