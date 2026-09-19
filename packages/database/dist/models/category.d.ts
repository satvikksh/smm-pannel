import mongoose from 'mongoose';
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
declare const Category: mongoose.Model<CategoryRecord, {}, {}, {}, mongoose.Document<unknown, {}, CategoryRecord, {}, {}> & CategoryRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Category;
