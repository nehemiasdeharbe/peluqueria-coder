import Booking from '../models/booking.model.js';
import '../models/service.model.js';
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

const serializePopulated = (booking) => {
  const plain = toPlain(booking);
  if (!plain) return null;
  return {
    ...plain,
    services: plain.services.map((entry) => ({
      service: toPlain(entry.service),
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

  async getByIdWithServices(id) {
    if (!isValidId(id)) return null;
    const booking = await Booking.findById(id).populate('services.service').lean();
    return serializePopulated(booking);
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