import mongoose from 'mongoose';
export interface ServiceRecord {
    _id: mongoose.Types.ObjectId;
    name: string;
    categoryId: mongoose.Types.ObjectId;
    description: string;
    price: number;
    minOrder: number;
    maxOrder: number;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}
declare const Service: mongoose.Model<ServiceRecord, {}, {}, {}, mongoose.Document<unknown, {}, ServiceRecord, {}, {}> & ServiceRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Service;
