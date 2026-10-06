import { Schema, model } from 'mongoose';

const bookingServiceSchema = new Schema(
  {
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const bookingSchema = new Schema(
  {
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, default: 'pendiente' },
    services: { type: [bookingServiceSchema], default: [] },
  },
  { versionKey: false }
);

export default model('Booking', bookingSchema);