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
      services: Array.isArray(bookingData.services) ? bookingData.services : [],
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

    const alreadyAdded = booking.services.some(
      (entry) => String(entry.service) === String(serviceId)
    );

    const updatedServices = alreadyAdded
      ? booking.services.map((entry) =>
          String(entry.service) === String(serviceId)
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        )
      : [...booking.services, { service: serviceId, quantity: 1 }];

    return this.bookingsRepository.update(bookingId, { services: updatedServices });
  }
}