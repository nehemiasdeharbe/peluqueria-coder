import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOKINGS_PATH = join(__dirname, '..', 'data', 'bookings.json');

/**
 * BookingsDAO
 * Lee y escribe directamente en src/data/bookings.json.
 * No contiene reglas de negocio ni validaciones.
 */
export default class BookingsDAO {
  constructor(path = BOOKINGS_PATH) {
    this.path = path;
  }

  async #read() {
    try {
      const data = await readFile(this.path, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new Error(`No se pudo leer el archivo de reservas: ${error.message}`);
    }
  }

  async #write(bookings) {
    await writeFile(this.path, JSON.stringify(bookings, null, 2), 'utf-8');
  }

  #generateId(bookings) {
    if (bookings.length === 0) return 1;
    const maxId = Math.max(...bookings.map((b) => Number(b.id) || 0));
    return maxId + 1;
  }

  async create(data) {
    const bookings = await this.#read();
    const newBooking = { id: this.#generateId(bookings), ...data };
    bookings.push(newBooking);
    await this.#write(bookings);
    return newBooking;
  }

  async getById(id) {
    const bookings = await this.#read();
    return bookings.find((b) => String(b.id) === String(id)) ?? null;
  }

  // Pisa solo los campos recibidos; el id nunca se modifica. Devuelve null si no existe.
  async update(id, data) {
    const bookings = await this.#read();
    const index = bookings.findIndex((b) => String(b.id) === String(id));
    if (index === -1) return null;

    bookings[index] = { ...bookings[index], ...data, id: bookings[index].id };
    await this.#write(bookings);
    return bookings[index];
  }
}