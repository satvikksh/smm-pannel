import mongoose from 'mongoose';
import {
  DEFAULT_PANEL_THEME,
  PANEL_THEMES,
  isPanelTheme,
  type PanelTheme,
} from '@smm/types';

const { Schema, model, models } = mongoose;

export interface AdminThemeSettingsRecord {
  _id: string; // Main Admin id
  theme: PanelTheme;
  enabledThemes: PanelTheme[];
  defaultTheme: PanelTheme;
  updatedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminThemeSettingsValue {
  theme: PanelTheme;
  enabledThemes: PanelTheme[];
  defaultTheme: PanelTheme;
  updatedBy: string | null;
  updatedAt: string | null;
}

const adminThemeSettingsSchema = new Schema<AdminThemeSettingsRecord>(
  {
    _id: { type: String, required: true },
    theme: {
      type: String,
      enum: PANEL_THEMES,
      required: true,
      default: DEFAULT_PANEL_THEME,
    },
    enabledThemes: {
      type: [String],
      enum: PANEL_THEMES,
      required: true,
      default: [...PANEL_THEMES],
    },
    defaultTheme: {
      type: String,
      enum: PANEL_THEMES,
      required: true,
      default: DEFAULT_PANEL_THEME,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false, _id: false },
);

const AdminThemeSettings =
  (models.AdminThemeSettings as mongoose.Model<AdminThemeSettingsRecord> | undefined) ??
  model<AdminThemeSettingsRecord>('AdminThemeSettings', adminThemeSettingsSchema);

/**
 * Super-Admin controlled theme settings for one Main Admin tenant. When no
 * document exists yet a safe default is returned (all themes enabled, Modern
 * Light everywhere).
 */
export async function getAdminThemeSettings(adminId: string): Promise<AdminThemeSettingsValue> {
  const doc = await AdminThemeSettings.findById(String(adminId)).lean();
  if (!doc) {
    return {
      theme: DEFAULT_PANEL_THEME,
      enabledThemes: [...PANEL_THEMES],
      defaultTheme: DEFAULT_PANEL_THEME,
      updatedBy: null,
      updatedAt: null,
    };
  }
  return {
    theme: isPanelTheme(doc.theme) ? doc.theme : DEFAULT_PANEL_THEME,
    enabledThemes: doc.enabledThemes.every(isPanelTheme) ? [...doc.enabledThemes] : [...PANEL_THEMES],
    defaultTheme: isPanelTheme(doc.defaultTheme) ? doc.defaultTheme : DEFAULT_PANEL_THEME,
    updatedBy: doc.updatedBy ? String(doc.updatedBy) : null,
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : null,
  };
}

/** Persists Super-Admin controlled theme configuration for one admin tenant. */
export async function setAdminThemeSettings(
  adminId: string,
  value: { theme: PanelTheme; enabledThemes: PanelTheme[]; defaultTheme: PanelTheme },
  updatedBy: mongoose.Types.ObjectId,
): Promise<void> {
  await AdminThemeSettings.findByIdAndUpdate(
    String(adminId),
    {
      $set: {
        theme: value.theme,
        enabledThemes: value.enabledThemes,
        defaultTheme: value.defaultTheme,
        updatedBy,
      },
    },
    { upsert: true, new: true },
  );
}

export default AdminThemeSettings;