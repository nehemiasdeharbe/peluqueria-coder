import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICES_PATH = join(__dirname, '..', 'data', 'services.json');

const REQUIRED_FIELDS = ['name', 'description', 'duration', 'price', 'category', 'available'];

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

  #validateRequiredFields(serviceData) {
    return REQUIRED_FIELDS.filter((field) => {
      const value = serviceData[field];
      return value === undefined || value === null || value === '';
    });
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
    const missing = this.#validateRequiredFields(serviceData);
    if (missing.length > 0) {
      throw new Error(`No se pudo crear el servicio, faltan campos requeridos: ${missing.join(', ')}`);
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

  async updateService(id, updatedData) {
    const services = await this.#readServices();
    const index = services.findIndex((s) => String(s.id) === String(id));
    if (index === -1) return null;

    const { id: _ignoredId, ...safeData } = updatedData ?? {};
    services[index] = { ...services[index], ...safeData, id: services[index].id };
    await this.#writeServices(services);
    return services[index];
  }

  async deleteService(id) {
    const services = await this.#readServices();
    const index = services.findIndex((s) => String(s.id) === String(id));
    if (index === -1) return null;

    const [deleted] = services.splice(index, 1);
    await this.#writeServices(services);
    return deleted;
  }
}