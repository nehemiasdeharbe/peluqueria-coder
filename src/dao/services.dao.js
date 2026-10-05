import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVICES_PATH = join(__dirname, '..', 'data', 'services.json');

/**
 * ServicesDAO
 * Lee y escribe directamente en src/data/services.json.
 * No contiene reglas de negocio ni validaciones.
 */
export default class ServicesDAO {
  constructor(path = SERVICES_PATH) {
    this.path = path;
  }

  async #read() {
    try {
      const data = await readFile(this.path, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new Error(`No se pudo leer el archivo de servicios: ${error.message}`);
    }
  }

  async #write(services) {
    await writeFile(this.path, JSON.stringify(services, null, 2), 'utf-8');
  }

  #generateId(services) {
    if (services.length === 0) return 1;
    const maxId = Math.max(...services.map((s) => Number(s.id) || 0));
    return maxId + 1;
  }

  async getAll() {
    return this.#read();
  }

  async getById(id) {
    const services = await this.#read();
    return services.find((s) => String(s.id) === String(id)) ?? null;
  }

  async create(data) {
    const services = await this.#read();
    const newService = { id: this.#generateId(services), ...data };
    services.push(newService);
    await this.#write(services);
    return newService;
  }

  // Pisa solo los campos recibidos; el id nunca se modifica. Devuelve null si no existe.
  async update(id, data) {
    const services = await this.#read();
    const index = services.findIndex((s) => String(s.id) === String(id));
    if (index === -1) return null;

    services[index] = { ...services[index], ...data, id: services[index].id };
    await this.#write(services);
    return services[index];
  }

  // Devuelve el servicio eliminado, o null si no existe.
  async delete(id) {
    const services = await this.#read();
    const index = services.findIndex((s) => String(s.id) === String(id));
    if (index === -1) return null;

    const [deleted] = services.splice(index, 1);
    await this.#write(services);
    return deleted;
  }
}