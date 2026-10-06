import { Schema, model } from 'mongoose';

const serviceSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    duration: {
      type: Number,
      required: true,
      validate: { validator: (value) => value > 0, message: 'duration debe ser mayor a 0' },
    },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true },
    available: { type: Boolean, required: true },
  },
  { versionKey: false }
);

export default model('Service', serviceSchema);