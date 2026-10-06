import mongoose from 'mongoose';
import env from './env.config.js';

export async function connectDB(options = {}) {
  await mongoose.connect(env.mongoUri, options);
  console.log(`[db] Conectado a MongoDB (base: ${mongoose.connection.name})`);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}