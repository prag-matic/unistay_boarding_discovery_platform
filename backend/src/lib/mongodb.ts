import mongoose from 'mongoose';
import { config } from '@/config/env.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/unistay_db';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[MongoDB] Connected to ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected');
  } catch (error) {
    console.error('[MongoDB] Disconnect error:', error);
  }
}

export default mongoose;
