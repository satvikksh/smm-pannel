import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

export interface PlatformSettingRecord {
  _id: mongoose.Types.ObjectId;
  key: string;
  value: unknown;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const platformSettingSchema = new Schema<PlatformSettingRecord>(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 100 },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false },
);

const PlatformSetting =
  (models.PlatformSetting as mongoose.Model<PlatformSettingRecord> | undefined) ??
  model<PlatformSettingRecord>('PlatformSetting', platformSettingSchema);

export default PlatformSetting;