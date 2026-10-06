import Service from '../models/service.model.js';
import { escapeRegex, isValidId, toPlain } from '../utils/mongo.js';

const buildQuery = ({ category, available } = {}) => {
  const query = {};
  if (category !== undefined) {
    query.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  }
  if (available !== undefined) {
    query.available = available;
  }
  return query;
};

const buildSort = ({ sortBy, order } = {}) =>
  sortBy ? { [sortBy]: order === 'desc' ? -1 : 1, _id: 1 } : { _id: 1 };

export default class ServicesDAO {
  async getAll(filter = {}) {
    const services = await Service.find(buildQuery(filter)).sort({ _id: 1 }).lean();
    return services.map(toPlain);
  }

  async findPaginated({ filter = {}, sort = {}, page, limit }) {
    const query = buildQuery(filter);

    const [services, total] = await Promise.all([
      Service.find(query)
        .sort(buildSort(sort))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Service.countDocuments(query),
    ]);

    return { items: services.map(toPlain), total };
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