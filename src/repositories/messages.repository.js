import MessagesDAO from '../dao/messages.dao.js';

export default class MessagesRepository {
  constructor(dao = new MessagesDAO()) {
    this.dao = dao;
  }

  create(data) {
    return this.dao.create(data);
  }

  findPaginated(options) {
    return this.dao.findPaginated(options);
  }

  getById(id) {
    return this.dao.getById(id);
  }

  delete(id) {
    return this.dao.delete(id);
  }
}