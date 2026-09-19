import mongoose from 'mongoose';
export declare function connectDatabase(uri: string): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
export declare function isConnected(): boolean;
export { mongoose };
