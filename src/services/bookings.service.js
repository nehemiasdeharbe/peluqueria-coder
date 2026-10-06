import BookingsRepository from '../repositories/bookings.repository.js';
import ServicesRepository from '../repositories/services.repository.js';
import HttpError from '../utils/httpError.js';

const REQUIRED_FIELDS = ['clientName', 'clientEmail', 'date', 'time'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export default class BookingsService {
  constructor(
    bookingsRepository = new BookingsRepository(),
    servicesRepository = new ServicesRepository()
  ) {
    this.bookingsRepository = bookingsRepository;
    this.servicesRepository = servicesRepository;
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

    if (bookingData.services !== undefined && !Array.isArray(bookingData.services)) {
      errors.push('El campo "services" debe ser un array');
    }

    return errors;
  }


  async #buildInitialServices(services = []) {
    const quantities = new Map();

    for (const item of services) {
      const quantity = item?.quantity ?? 1;
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new HttpError(400, 'No se pudo crear la reserva: "quantity" debe ser un entero mayor o igual a 1');
      }

      const service = await this.servicesRepository.getById(item?.service);
      if (!service) {
        throw new HttpError(400, `No se pudo crear la reserva: no existe un servicio con id ${item?.service}`);
      }

      quantities.set(service.id, (quantities.get(service.id) ?? 0) + quantity);
    }

    return [...quantities].map(([service, quantity]) => ({ service, quantity }));
  }

  async createBooking(bookingData) {
    if (!bookingData || typeof bookingData !== 'object') {
      throw new HttpError(400, 'Los datos de la reserva son inválidos');
    }

    const errors = this.#validateBookingData(bookingData);
    if (errors.length > 0) {
      throw new HttpError(400, `No se pudo crear la reserva: ${errors.join('; ')}`);
    }

    const newBooking = {
      clientName: bookingData.clientName,
      clientEmail: bookingData.clientEmail,
      date: bookingData.date,
      time: bookingData.time,
      status: bookingData.status ?? 'pendiente',
      services: await this.#buildInitialServices(bookingData.services),
    };

    return this.bookingsRepository.create(newBooking);
  }

  async getBookingById(id) {
    const booking = await this.bookingsRepository.getById(id);
    if (!booking) {
      throw new HttpError(404, `No existe una reserva con id ${id}`);
    }
    return booking;
  }

  async addServiceToBooking(bookingId, serviceId) {
    const booking = await this.getBookingById(bookingId);

    const service = await this.servicesRepository.getById(serviceId);
    if (!service) {
      throw new HttpError(404, `No existe un servicio con id ${serviceId}`);
    }

    const alreadyAdded = booking.services.some((entry) => entry.service === service.id);

    const updatedServices = alreadyAdded
      ? booking.services.map((entry) =>
          entry.service === service.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        )
      : [...booking.services, { service: service.id, quantity: 1 }];

    return this.bookingsRepository.update(bookingId, { services: updatedServices });
  }
}