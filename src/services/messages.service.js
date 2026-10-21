import MessagesRepository from '../repositories/messages.repository.js';
import HttpError from '../utils/httpError.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export default class MessagesService {
  constructor(messagesRepository = new MessagesRepository()) {
    this.messagesRepository = messagesRepository;
  }

  async createMessage(messageData) {
    return this.messagesRepository.create(messageData);
  }

  async getMessages({ page = 1, limit = 10 } = {}) {
    const { items, total } = await this.messagesRepository.findPaginated({ page, limit });

    return { messages: items, ...buildPaginationMeta({ total, page, limit }) };
  }

  async getMessageById(id) {
    const message = await this.messagesRepository.getById(id);
    if (!message) {
      throw new HttpError(404, `No existe un mensaje con id ${id}`);
    }
    return message;
  }

  async deleteMessage(id) {
    const deleted = await this.messagesRepository.delete(id);
    if (!deleted) {
      throw new HttpError(404, `No existe un mensaje con id ${id}`);
    }
    return deleted;
  }
}