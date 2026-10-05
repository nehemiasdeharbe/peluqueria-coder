import ServicesDAO from '../dao/services.dao.js';

/**
 * ServicesRepository
 * Ofrece métodos de acceso a datos de services. No contiene reglas de negocio:
 * solo delega en el DAO. Si cambia la persistencia, el service no se entera.
 */
export default class ServicesRepository {
  constructor(dao = new ServicesDAO()) {
    this.dao = dao;
  }

  getAll() {
    return this.dao.getAll();
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