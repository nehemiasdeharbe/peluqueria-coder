import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOKINGS_PATH = join(__dirname, '..', 'data', 'bookings.json');

const REQUIRED_FIELDS = ['clientName', 'clientEmail', 'date', 'time'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * BookingManager
 * Administra las reservas del sistema de turnos, persistiendo
 * los datos en src/data/bookings.json. No conoce ServiceManager:
 * la validación de que un servicio exista se hace en el router.
 */
export default class BookingManager {
  constructor(path = BOOKINGS_PATH) {
    this.path = path;
  }

  async #readBookings() {
    try {
      const data = await readFile(this.path, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new Error(`No se pudo leer el archivo de reservas: ${error.message}`);
    }
  }

  async #writeBookings(bookings) {
    await writeFile(this.path, JSON.stringify(bookings, null, 2), 'utf-8');
  }

  #generateId(bookings) {
    if (bookings.length === 0) return 1;
    const maxId = Math.max(...bookings.map((b) => Number(b.id) || 0));
    return maxId + 1;
  }

  #validateBookingData(bookingData) {
    const errors = [];

    for (const field of REQUIRED_FIELDS) {
      const value = bookingData[field];
      if (value === undefined || value === null || value === '') {
        errors.push(`Falta el campo requerido: ${field}`);
      }
    }

    if (bookingData.clientEmail && !EMAIL_REGEX.test(bookingData.clientEmail)) {
      errors.push('El campo "clientEmail" debe ser un email válido');
    }

    if (
      bookingData.services !== undefined &&
      !Array.isArray(bookingData.services)
    ) {
      errors.push('El campo "services" debe ser un array');
    }

    return errors;
  }

  async getBookings() {
    return this.#readBookings();
  }

  async getBookingById(id) {
    const bookings = await this.#readBookings();
    return bookings.find((b) => String(b.id) === String(id)) ?? null;
  }

  /**
   * Crea una reserva. Puede iniciarse con services vacío.
   * @throws {Error} si faltan campos requeridos o son inválidos
   */
  async createBooking(bookingData) {
    if (!bookingData || typeof bookingData !== 'object') {
      throw new Error('Los datos de la reserva son inválidos');
    }

    const errors = this.#validateBookingData(bookingData);
    if (errors.length > 0) {
      throw new Error(`No se pudo crear la reserva: ${errors.join('; ')}`);
    }

    const bookings = await this.#readBookings();

    const newBooking = {
      id: this.#generateId(bookings),
      clientName: bookingData.clientName,
      clientEmail: bookingData.clientEmail,
      date: bookingData.date,
      time: bookingData.time,
      status: bookingData.status ?? 'pendiente',
      services: Array.isArray(bookingData.services) ? bookingData.services : [],
    };

    bookings.push(newBooking);
    await this.#writeBookings(bookings);

    return newBooking;
  }

  /**
   * Agrega un servicio a una reserva existente. Si el servicio ya
   * estaba agregado, incrementa su quantity en vez de duplicarlo.
   * No valida que el servicio exista en ServiceManager; eso lo
   * hace el router antes de llamar a este método.
   * @returns {Promise<object|null>} la reserva actualizada, o null si no existe
   */
  async addServiceToBooking(bookingId, serviceId) {
    const bookings = await this.#readBookings();
    const index = bookings.findIndex((b) => String(b.id) === String(bookingId));

    if (index === -1) {
      return null;
    }

    const booking = bookings[index];
    const existingEntry = booking.services.find(
      (entry) => String(entry.service) === String(serviceId)
    );

    if (existingEntry) {
      existingEntry.quantity += 1;
    } else {
      booking.services.push({ service: serviceId, quantity: 1 });
    }

    await this.#writeBookings(bookings);
    return booking;
  }
}