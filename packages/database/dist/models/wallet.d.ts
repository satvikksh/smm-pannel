import mongoose from 'mongoose';
export interface WalletRecord {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    balance: number;
    totalDeposited: number;
    totalSpent: number;
    currency: string;
    updatedAt: Date;
}
declare const Wallet: mongoose.Model<WalletRecord, {}, {}, {}, mongoose.Document<unknown, {}, WalletRecord, {}, {}> & WalletRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Wallet;
