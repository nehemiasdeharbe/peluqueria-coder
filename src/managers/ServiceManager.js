import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICES_PATH = join(__dirname, '..', 'data', 'services.json');

const REQUIRED_FIELDS = ['name', 'description', 'duration', 'price', 'category', 'available'];

/**
 * ServiceManager
 * Administra los servicios del sistema de turnos y reservas,
 * persistiendo los datos en src/data/services.json.
 */
export default class ServiceManager {
  constructor(path = SERVICES_PATH) {
    this.path = path;
  }

  async #readServices() {
    try {
      const data = await readFile(this.path, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new Error(`No se pudo leer el archivo de servicios: ${error.message}`);
    }
  }

  async #writeServices(services) {
    await writeFile(this.path, JSON.stringify(services, null, 2), 'utf-8');
  }

  #generateId(services) {
    if (services.length === 0) return 1;
    const maxId = Math.max(...services.map((s) => Number(s.id) || 0));
    return maxId + 1;
  }

  /**
   * Valida presencia y tipo de los campos de un servicio.
   * @returns {string[]} lista de mensajes de error (vacía si es válido)
   */
  #validateServiceData(serviceData, { partial = false } = {}) {
    const errors = [];

    for (const field of REQUIRED_FIELDS) {
      if (!partial) {
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
    let services = await this.#readServices();

    if (category !== undefined) {
      services = services.filter(
        (s) => String(s.category).toLowerCase() === String(category).toLowerCase()
      );
    }

    if (available !== undefined) {
      const wanted = String(available) === 'true';
      services = services.filter((s) => s.available === wanted);
    }

    return services;
  }

  async getServiceById(id) {
    const services = await this.#readServices();
    return services.find((s) => String(s.id) === String(id)) ?? null;
  }

  async addService(serviceData) {
    if (!serviceData || typeof serviceData !== 'object') {
      throw new Error('Los datos del servicio son inválidos');
    }

    const errors = this.#validateServiceData(serviceData);
    if (errors.length > 0) {
      throw new Error(`No se pudo crear el servicio: ${errors.join('; ')}`);
    }

    const services = await this.#readServices();

    const newService = {
      id: this.#generateId(services),
      name: serviceData.name,
      description: serviceData.description,
      duration: serviceData.duration,
      price: serviceData.price,
      category: serviceData.category,
      available: serviceData.available,
    };

    services.push(newService);
    await this.#writeServices(services);

    return newService;
  }

  /**
   * Actualiza un servicio existente. Es un merge parcial (semántica tipo PATCH):
   * solo pisa los campos que vengan en updatedData, el resto se conserva.
   * No permite modificar el id.
   */
  async updateService(id, updatedData) {
    const services = await this.#readServices();
    const index = services.findIndex((s) => String(s.id) === String(id));

    if (index === -1) {
      return null;
    }

    const { id: _ignoredId, ...safeData } = updatedData ?? {};

    const errors = this.#validateServiceData(safeData, { partial: true });
    if (errors.length > 0) {
      throw new Error(`No se pudo actualizar el servicio: ${errors.join('; ')}`);
    }

    services[index] = {
      ...services[index],
      ...safeData,
      id: services[index].id,
    };

    await this.#writeServices(services);
    return services[index];
  }

  async deleteService(id) {
    const services = await this.#readServices();
    const index = services.findIndex((s) => String(s.id) === String(id));

    if (index === -1) {
      return null;
    }

    const [deleted] = services.splice(index, 1);
    await this.#writeServices(services);
    return deleted;
  }
}