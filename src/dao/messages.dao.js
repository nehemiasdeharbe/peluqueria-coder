import Message from '../models/message.model.js';
import { isValidId, toPlain } from '../utils/mongo.js';

export default class MessagesDAO {
  async create(data) {
    const message = await Message.create(data);
    return toPlain(message.toObject());
  }

  async findPaginated({ page, limit }) {
    const [messages, total] = await Promise.all([
      Message.find()
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Message.countDocuments(),
    ]);

    return { items: messages.map(toPlain), total };
  }

  async getById(id) {
    if (!isValidId(id)) return null;
    return toPlain(await Message.findById(id).lean());
  }

  async delete(id) {
    if (!isValidId(id)) return null;
    return toPlain(await Message.findByIdAndDelete(id).lean());
  }
}