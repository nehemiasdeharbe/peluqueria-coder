import { Schema, model } from 'mongoose';

const messageSchema = new Schema(
  {
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    message: { type: String, required: true },
  },
  { versionKey: false, timestamps: true }
);

export default model('Message', messageSchema);