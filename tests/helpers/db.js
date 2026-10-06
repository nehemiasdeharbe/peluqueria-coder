import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../../src/config/db.config.js';
import Service from '../../src/models/service.model.js';
import Booking from '../../src/models/booking.model.js';

export const TEST_DB_NAME = 'peluqueria_test';

export async function setupTestDB() {
  await connectDB({ dbName: TEST_DB_NAME });
  if (mongoose.connection.name !== TEST_DB_NAME) {
    throw new Error(`Los tests deben correr sobre "${TEST_DB_NAME}", no sobre "${mongoose.connection.name}"`);
  }
  await clearTestDB();
}

export async function clearTestDB() {
  await Service.deleteMany({});
  await Booking.deleteMany({});
}

export async function teardownTestDB() {
  await clearTestDB();
  await disconnectDB();
}