import Booking from '../models/booking.model.js';
import { isValidId, toPlain } from '../utils/mongo.js';

const serialize = (booking) => {
  const plain = toPlain(booking);
  if (!plain) return null;
  return {
    ...plain,
    services: plain.services.map((entry) => ({
      service: String(entry.service),
      quantity: entry.quantity,
    })),
  };
};

export default class BookingsDAO {
  async create(data) {
    const booking = await Booking.create(data);
    return serialize(booking.toObject());
  }

  async getById(id) {
    if (!isValidId(id)) return null;
    return serialize(await Booking.findById(id).lean());
  }

  async update(id, data) {
    if (!isValidId(id)) return null;
    const updated = await Booking.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    return serialize(updated);
  }
}