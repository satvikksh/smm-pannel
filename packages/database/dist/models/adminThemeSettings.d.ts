import mongoose from 'mongoose';
import { type PanelTheme } from '@smm/types';
export interface AdminThemeSettingsRecord {
    _id: string;
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
declare const AdminThemeSettings: mongoose.Model<AdminThemeSettingsRecord, {}, {}, {}, mongoose.Document<unknown, {}, AdminThemeSettingsRecord, {}, {}> & AdminThemeSettingsRecord & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
/**
 * Super-Admin controlled theme settings for one Main Admin tenant. When no
 * document exists yet a safe default is returned (all themes enabled, Modern
 * Light everywhere).
 */
export declare function getAdminThemeSettings(adminId: string): Promise<AdminThemeSettingsValue>;
/** Persists Super-Admin controlled theme configuration for one admin tenant. */
export declare function setAdminThemeSettings(adminId: string, value: {
    theme: PanelTheme;
    enabledThemes: PanelTheme[];
    defaultTheme: PanelTheme;
}, updatedBy: mongoose.Types.ObjectId): Promise<void>;
export default AdminThemeSettings;
