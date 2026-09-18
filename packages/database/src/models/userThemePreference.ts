import mongoose from 'mongoose';
import {
  DEFAULT_PANEL_THEME,
  PANEL_THEMES,
  isPanelTheme,
  type PanelTheme,
} from '@smm/types';

const { Schema, model, models } = mongoose;

export interface UserThemePreferenceRecord {
  _id: string; // user id
  theme: PanelTheme;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserThemePreferenceValue {
  theme: PanelTheme;
  updatedBy: string | null;
  updatedAt: string | null;
}

const userThemePreferenceSchema = new Schema<UserThemePreferenceRecord>(
  {
    _id: { type: String, required: true },
    theme: {
      type: String,
      enum: PANEL_THEMES,
      required: true,
      default: DEFAULT_PANEL_THEME,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, _id: false },
);

const UserThemePreference =
  (models.UserThemePreference as mongoose.Model<UserThemePreferenceRecord> | undefined) ??
  model<UserThemePreferenceRecord>('UserThemePreference', userThemePreferenceSchema);

/**
 * Optional per-user theme override. Honored only when the user's tenant allows
 * overrides (`UserThemeSettings.allowUserOverride`). Keyed by the user id.
 */
export async function getUserThemePreference(userId: string): Promise<UserThemePreferenceValue | null> {
  const doc = await UserThemePreference.findById(String(userId)).lean();
  if (!doc) return null;
  return {
    theme: isPanelTheme(doc.theme) ? doc.theme : DEFAULT_PANEL_THEME,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

export async function setUserThemePreference(
  userId: string,
  theme: PanelTheme,
  updatedBy: mongoose.Types.ObjectId,
): Promise<void> {
  await UserThemePreference.findByIdAndUpdate(
    String(userId),
    { $set: { theme, updatedBy } },
    { upsert: true, new: true },
  );
}

/** Removes the override, reverting the user to the tenant theme. */
export async function clearUserThemePreference(userId: string): Promise<void> {
  await UserThemePreference.findByIdAndDelete(String(userId));
}

export default UserThemePreference;