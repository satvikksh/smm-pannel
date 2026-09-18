import mongoose from 'mongoose';

export async function connectDatabase(uri: string): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export { mongoose };