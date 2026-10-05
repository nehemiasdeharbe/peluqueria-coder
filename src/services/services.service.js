import ServicesRepository from '../repositories/services.repository.js';
import HttpError from '../utils/httpError.js';

const REQUIRED_FIELDS = ['name', 'description', 'duration', 'price', 'category', 'available'];

/**
 * ServicesService
 * Reglas de negocio de services: validaciones, filtros y semántica de PUT (merge parcial).
 * No conoce req/res ni archivos: habla solo con el repository.
 */
export default class ServicesService {
  constructor(servicesRepository = new ServicesRepository()) {
    this.servicesRepository = servicesRepository;
  }

  /**
   * Valida presencia y tipo de los campos de un servicio.
   * @returns {string[]} lista de mensajes de error (vacía si es válido)
   */
  #validateServiceData(serviceData, { partial = false } = {}) {
    const errors = [];

    if (!partial) {
      for (const field of REQUIRED_FIELDS) {
        const value = serviceData[field];
        if (value === undefined || value === null || value === '') {
          errors.push(`Falta el campo requerido: ${field}`);
        }
      }
    }

    if (
      serviceData.duration !== undefined &&
      (typeof serviceData.duration !== 'number' || Number.isNaN(serviceData.duration) || serviceData.duration <= 0)
    ) {
      errors.push('El campo "duration" debe ser un número mayor a 0');
    }

    if (
      serviceData.price !== undefined &&
      (typeof serviceData.price !== 'number' || Number.isNaN(serviceData.price) || serviceData.price < 0)
    ) {
      errors.push('El campo "price" debe ser un número mayor o igual a 0');
    }

    if (serviceData.name !== undefined && typeof serviceData.name !== 'string') {
      errors.push('El campo "name" debe ser un texto');
    }

    if (serviceData.description !== undefined && typeof serviceData.description !== 'string') {
      errors.push('El campo "description" debe ser un texto');
    }

    if (serviceData.category !== undefined && typeof serviceData.category !== 'string') {
      errors.push('El campo "category" debe ser un texto');
    }

    if (serviceData.available !== undefined && typeof serviceData.available !== 'boolean') {
      errors.push('El campo "available" debe ser true o false');
    }

    return errors;
  }

  async getServices({ category, available } = {}) {
    if (available !== undefined && available !== 'true' && available !== 'false') {
      throw new HttpError(400, 'El filtro "available" debe ser true o false');
    }

    let services = await this.servicesRepository.getAll();

    if (category !== undefined) {
      services = services.filter(
        (s) => String(s.category).toLowerCase() === String(category).toLowerCase()
      );
    }

    if (available !== undefined) {
      const wanted = available === 'true';
      services = services.filter((s) => s.available === wanted);
    }

    return services;
  }

  async getServiceById(id) {
    const service = await this.servicesRepository.getById(id);
    if (!service) {
      throw new HttpError(404, `No existe un servicio con id ${id}`);
    }
    return service;
  }

  async createService(serviceData) {
    if (!serviceData || typeof serviceData !== 'object') {
      throw new HttpError(400, 'Los datos del servicio son inválidos');
    }

    const errors = this.#validateServiceData(serviceData);
    if (errors.length > 0) {
      throw new HttpError(400, `No se pudo crear el servicio: ${errors.join('; ')}`);
    }

    // Se arma el objeto campo por campo: un id enviado por el cliente se ignora
    const newService = {
      name: serviceData.name,
      description: serviceData.description,
      duration: serviceData.duration,
      price: serviceData.price,
      category: serviceData.category,
      available: serviceData.available,
    };

    return this.servicesRepository.create(newService);
  }

  /**
   * Actualiza un servicio existente. Es un merge parcial (semántica tipo PATCH):
   * solo pisa los campos que vengan en updatedData, el resto se conserva.
   * No permite modificar el id.
   */
  async updateService(id, updatedData) {
    await this.getServiceById(id); // 404 si no existe

    const { id: _ignoredId, ...safeData } = updatedData ?? {};

    const errors = this.#validateServiceData(safeData, { partial: true });
    if (errors.length > 0) {
      throw new HttpError(400, `No se pudo actualizar el servicio: ${errors.join('; ')}`);
    }

    return this.servicesRepository.update(id, safeData);
  }

  async deleteService(id) {
    const deleted = await this.servicesRepository.delete(id);
    if (!deleted) {
      throw new HttpError(404, `No existe un servicio con id ${id}`);
    }
    return deleted;
  }
}