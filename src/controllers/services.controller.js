import ServicesService from '../services/services.service.js';

const servicesService = new ServicesService();

const sendError = (res, error) =>
  res.status(error.status ?? 500).json({ error: error.message });

export const getServices = async (req, res) => {
  try {
    const { category, available } = req.query;
    const services = await servicesService.getServices({ category, available });
    res.status(200).json(services);
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
    const newService = await servicesService.createService(req.body);
    res.status(201).json(newService);
  } catch (error) {
    sendError(res, error);
  }
};

export const updateService = async (req, res) => {
  try {
    const updated = await servicesService.updateService(req.params.sid, req.body);
    res.status(200).json(updated);
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteService = async (req, res) => {
  try {
    const deleted = await servicesService.deleteService(req.params.sid);
    res.status(200).json(deleted);
  } catch (error) {
    sendError(res, error);
  }
};