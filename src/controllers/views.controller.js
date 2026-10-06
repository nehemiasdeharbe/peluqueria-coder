import ServicesService from '../services/services.service.js';

const servicesService = new ServicesService();

export const getServicesView = async (req, res, next) => {
  try {
    const services = await servicesService.getServices();
    res.render('services', { title: 'Servicios', servicesActive: true, services });
  } catch (error) {
    next(error);
  }
};

export const getAvailabilityView = async (req, res, next) => {
  try {
    const [available, unavailable] = await Promise.all([
      servicesService.getServices({ available: 'true' }),
      servicesService.getServices({ available: 'false' }),
    ]);
    res.render('availability', {
      title: 'Disponibilidad',
      availabilityActive: true,
      available,
      unavailable,
    });
  } catch (error) {
    next(error);
  }
};