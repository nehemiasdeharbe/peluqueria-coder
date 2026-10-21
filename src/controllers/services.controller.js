import ServicesService from '../services/services.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const servicesService = new ServicesService();

const notify = (req, event, payload) => req.app.get('io')?.emit(event, payload);

export const getServices = asyncHandler(async (req, res) => {
  const result = await servicesService.getServices(req.validated.query);
  res.status(200).json(result);
});

export const getServiceById = asyncHandler(async (req, res) => {
  const service = await servicesService.getServiceById(req.params.sid);
  res.status(200).json(service);
});

export const createService = asyncHandler(async (req, res) => {
  const newService = await servicesService.createService(req.validated.body);
  notify(req, 'service:created', newService);
  res.status(201).json(newService);
});

export const updateService = asyncHandler(async (req, res) => {
  const updated = await servicesService.updateService(req.params.sid, req.validated.body);
  notify(req, 'service:updated', updated);
  res.status(200).json(updated);
});

export const deleteService = asyncHandler(async (req, res) => {
  const deleted = await servicesService.deleteService(req.params.sid);
  notify(req, 'service:deleted', { id: deleted.id });
  res.status(200).json(deleted);
});