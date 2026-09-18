import mongoose from 'mongoose';
import {
  DEFAULT_PANEL_THEME,
  PANEL_THEMES,
  isPanelTheme,
  type PanelTheme,
} from '@smm/types';

const { Schema, model, models } = mongoose;

export interface UserThemeSettingsRecord {
  _id: string; // tenant Main Admin id
  theme: PanelTheme;
  allowUserOverride: boolean;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserThemeSettingsValue {
  theme: PanelTheme;
  allowUserOverride: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
}

const userThemeSettingsSchema = new Schema<UserThemeSettingsRecord>(
  {
    _id: { type: String, required: true },
    theme: {
      type: String,
      enum: PANEL_THEMES,
      required: true,
      default: DEFAULT_PANEL_THEME,
    },
    allowUserOverride: { type: Boolean, required: true, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, _id: false },
);

const UserThemeSettings =
  (models.UserThemeSettings as mongoose.Model<UserThemeSettingsRecord> | undefined) ??
  model<UserThemeSettingsRecord>('UserThemeSettings', userThemeSettingsSchema);

/**
 * Tenant-scoped User Panel theme settings for one Main Admin. There is one
 * document per `adminId`; when it does not exist yet the default theme and a
 * closed override flag are returned. No theme is ever hard-coded on the client.
 */
export async function getUserThemeSettings(adminId: string): Promise<UserThemeSettingsValue> {
  const doc = await UserThemeSettings.findById(String(adminId)).lean();
  if (!doc) {
    return { theme: DEFAULT_PANEL_THEME, allowUserOverride: false, updatedBy: null, updatedAt: null };
  }
  return {
    theme: isPanelTheme(doc.theme) ? doc.theme : DEFAULT_PANEL_THEME,
    allowUserOverride: doc.allowUserOverride,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

/** Persists a Main Admin's User Panel theme settings for their tenant. */
export async function setUserThemeSettings(
  adminId: string,
  value: { theme: PanelTheme; allowUserOverride: boolean },
  updatedBy: mongoose.Types.ObjectId,
): Promise<void> {
  await UserThemeSettings.findByIdAndUpdate(
    String(adminId),
    { $set: { theme: value.theme, allowUserOverride: value.allowUserOverride, updatedBy } },
    { upsert: true, new: true },
  );
}

export default UserThemeSettings;