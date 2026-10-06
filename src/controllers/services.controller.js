import ServicesService from '../services/services.service.js';

const servicesService = new ServicesService();

const sendError = (res, error) =>
  res.status(error.status ?? 500).json({ error: error.message });

const notify = (req, event, payload) => req.app.get('io')?.emit(event, payload);

export const getServices = async (req, res) => {
  try {
    // Query ya validada y normalizada por el middleware (page, limit, order con valores por defecto)
    const result = await servicesService.getServices(req.validated.query);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
};

export const getServiceById = async (req, res) => {
  try {
    const service = await servicesService.getServiceById(req.params.sid);
    res.status(200).json(service);
  } catch (error) {
    sendError(res, error);
  }
};

export const createService = async (req, res) => {
  try {
    const newService = await servicesService.createService(req.validated.body);
    notify(req, 'service:created', newService);
    res.status(201).json(newService);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateService = async (req, res) => {
  try {
    const updated = await servicesService.updateService(req.params.sid, req.validated.body);
    notify(req, 'service:updated', updated);
    res.status(200).json(updated);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteService = async (req, res) => {
  try {
    const deleted = await servicesService.deleteService(req.params.sid);
    notify(req, 'service:deleted', { id: deleted.id });
    res.status(200).json(deleted);
  } catch (error) {
    sendError(res, error);
  }
};