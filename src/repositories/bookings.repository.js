import BookingsDAO from '../dao/bookings.dao.js';

/**
 * BookingsRepository
 * Ofrece métodos de acceso a datos de bookings. No contiene reglas de negocio:
 * solo delega en el DAO.
 */
export default class BookingsRepository {
  constructor(dao = new BookingsDAO()) {
    this.dao = dao;
  }

  create(data) {
    return this.dao.create(data);
  }

  getById(id) {
    return this.dao.getById(id);
  }

  update(id, data) {
    return this.dao.update(id, data);
  }
}