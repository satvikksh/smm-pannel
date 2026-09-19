import mongoose from 'mongoose';
export interface PaymentMethodRecord {
    _id: mongoose.Types.ObjectId;
    name: string;
    code: string;
    enabled: boolean;
    instructions: string;
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
declare const PaymentMethod: mongoose.Model<PaymentMethodRecord, {}, {}, {}, mongoose.Document<unknown, {}, PaymentMethodRecord, {}, {}> & PaymentMethodRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default PaymentMethod;
