import mongoose from 'mongoose';
export interface PlatformSettingRecord {
    _id: mongoose.Types.ObjectId;
    key: string;
    value: unknown;
    updatedBy: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}
declare const PlatformSetting: mongoose.Model<PlatformSettingRecord, {}, {}, {}, mongoose.Document<unknown, {}, PlatformSettingRecord, {}, {}> & PlatformSettingRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default PlatformSetting;
