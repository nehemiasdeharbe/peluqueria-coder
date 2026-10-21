import ServicesService from '../services/services.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const servicesService = new ServicesService();

export const getServicesView = asyncHandler(async (req, res) => {
  const services = await servicesService.listServices();
  res.render('services', { title: 'Servicios', servicesActive: true, services });
});

export const getAvailabilityView = asyncHandler(async (req, res) => {
  const [available, unavailable] = await Promise.all([
    servicesService.listServices({ available: true }),
    servicesService.listServices({ available: false }),
  ]);

  res.render('availability', {
    title: 'Disponibilidad',
    availabilityActive: true,
    available,
    unavailable,
  });
});