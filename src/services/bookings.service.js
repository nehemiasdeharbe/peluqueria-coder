import BookingsRepository from '../repositories/bookings.repository.js';
import ServicesRepository from '../repositories/services.repository.js';
import HttpError from '../utils/httpError.js';
import { buildPaginationMeta } from '../utils/pagination.js';

export default class BookingsService {
  constructor(
    bookingsRepository = new BookingsRepository(),
    servicesRepository = new ServicesRepository()
  ) {
    this.bookingsRepository = bookingsRepository;
    this.servicesRepository = servicesRepository;
  }

  async #buildInitialServices(services = []) {
    const quantities = new Map();

    for (const item of services) {
      const service = await this.servicesRepository.getById(item.service);
      if (!service) {
        throw new HttpError(400, `No se pudo crear la reserva: no existe un servicio con id ${item.service}`);
      }
      quantities.set(service.id, (quantities.get(service.id) ?? 0) + item.quantity);
    }

    return [...quantities].map(([service, quantity]) => ({ service, quantity }));
  }

  async createBooking(bookingData) {
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

  async getBookings({ status, page = 1, limit = 10 } = {}) {
    const { items, total } = await this.bookingsRepository.findPaginatedWithServices({
      filter: { status },
      page,
      limit,
    });

    return { bookings: items, ...buildPaginationMeta({ total, page, limit }) };
  }

  async getBookingById(id) {
    const booking = await this.bookingsRepository.getByIdWithServices(id);
    if (!booking) {
      throw new HttpError(404, `No existe una reserva con id ${id}`);
    }
    return booking;
  }

  async addServiceToBooking(bookingId, serviceId) {
    const booking = await this.bookingsRepository.getById(bookingId);
    if (!booking) {
      throw new HttpError(404, `No existe una reserva con id ${bookingId}`);
    }

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