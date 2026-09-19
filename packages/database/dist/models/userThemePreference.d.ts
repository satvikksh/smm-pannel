import mongoose from 'mongoose';
import { type PanelTheme } from '@smm/types';
export interface UserThemePreferenceRecord {
    _id: string;
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
declare const UserThemePreference: mongoose.Model<UserThemePreferenceRecord, {}, {}, {}, mongoose.Document<unknown, {}, UserThemePreferenceRecord, {}, {}> & UserThemePreferenceRecord & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
/**
 * Optional per-user theme override. Honored only when the user's tenant allows
 * overrides (`UserThemeSettings.allowUserOverride`). Keyed by the user id.
 */
export declare function getUserThemePreference(userId: string): Promise<UserThemePreferenceValue | null>;
export declare function setUserThemePreference(userId: string, theme: PanelTheme, updatedBy: mongoose.Types.ObjectId): Promise<void>;
/** Removes the override, reverting the user to the tenant theme. */
export declare function clearUserThemePreference(userId: string): Promise<void>;
export default UserThemePreference;
