import ServicesDAO from '../dao/services.dao.js';

export default class ServicesRepository {
  constructor(dao = new ServicesDAO()) {
    this.dao = dao;
  }

  getAll(filter) {
    return this.dao.getAll(filter);
  }

  findPaginated(options) {
    return this.dao.findPaginated(options);
  }

  getById(id) {
    return this.dao.getById(id);
  }

  create(data) {
    return this.dao.create(data);
  }

  update(id, data) {
    return this.dao.update(id, data);
  }

  delete(id) {
    return this.dao.delete(id);
  }
}