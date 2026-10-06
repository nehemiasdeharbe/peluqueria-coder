import Service from '../models/service.model.js';
import { isValidId, toPlain } from '../utils/mongo.js';

export default class ServicesDAO {
  async getAll() {
    const services = await Service.find().sort({ _id: 1 }).lean();
    return services.map(toPlain);
  }

  async getById(id) {
    if (!isValidId(id)) return null;
    return toPlain(await Service.findById(id).lean());
  }

  async create(data) {
    const service = await Service.create(data);
    return toPlain(service.toObject());
  }

  async update(id, data) {
    if (!isValidId(id)) return null;
    const updated = await Service.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    return toPlain(updated);
  }

  async delete(id) {
    if (!isValidId(id)) return null;
    return toPlain(await Service.findByIdAndDelete(id).lean());
  }
}