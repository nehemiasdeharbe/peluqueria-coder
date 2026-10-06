import ServicesRepository from '../repositories/services.repository.js';
import HttpError from '../utils/httpError.js';

export default class ServicesService {
  constructor(servicesRepository = new ServicesRepository()) {
    this.servicesRepository = servicesRepository;
  }

  async getServices({ category, available, page = 1, limit = 10, sortBy, order = 'asc' } = {}) {
    const { items, total } = await this.servicesRepository.findPaginated({
      filter: { category, available },
      sort: { sortBy, order },
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      services: items,
      total,
      page,
      limit,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
    };
  }

  async listServices({ category, available } = {}) {
    return this.servicesRepository.getAll({ category, available });
  }

  async getServiceById(id) {
    const service = await this.servicesRepository.getById(id);
    if (!service) {
      throw new HttpError(404, `No existe un servicio con id ${id}`);
    }
    return service;
  }

  async createService(serviceData) {
    return this.servicesRepository.create(serviceData);
  }

  async updateService(id, updatedData) {
    await this.getServiceById(id); 
    return this.servicesRepository.update(id, updatedData);
  }

  async deleteService(id) {
    const deleted = await this.servicesRepository.delete(id);
    if (!deleted) {
      throw new HttpError(404, `No existe un servicio con id ${id}`);
    }
    return deleted;
  }
}