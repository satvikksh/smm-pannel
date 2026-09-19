import mongoose from 'mongoose';
import { type PanelTheme } from '@smm/types';
export interface UserThemeSettingsRecord {
    _id: string;
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
declare const UserThemeSettings: mongoose.Model<UserThemeSettingsRecord, {}, {}, {}, mongoose.Document<unknown, {}, UserThemeSettingsRecord, {}, {}> & UserThemeSettingsRecord & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
/**
 * Tenant-scoped User Panel theme settings for one Main Admin. There is one
 * document per `adminId`; when it does not exist yet the default theme and a
 * closed override flag are returned. No theme is ever hard-coded on the client.
 */
export declare function getUserThemeSettings(adminId: string): Promise<UserThemeSettingsValue>;
/** Persists a Main Admin's User Panel theme settings for their tenant. */
export declare function setUserThemeSettings(adminId: string, value: {
    theme: PanelTheme;
    allowUserOverride: boolean;
}, updatedBy: mongoose.Types.ObjectId): Promise<void>;
export default UserThemeSettings;
