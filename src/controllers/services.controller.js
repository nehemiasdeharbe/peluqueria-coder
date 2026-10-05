import ServicesService from '../services/services.service.js';

const servicesService = new ServicesService();

// Los services lanzan errores con .status (400, 404); cualquier otro error es un 500
const sendError = (res, error) =>
  res.status(error.status ?? 500).json({ error: error.message });

// GET /api/services  (filtros opcionales: ?category=peluqueria&available=true)
export const getServices = async (req, res) => {
  try {
    const { category, available } = req.query;
    const services = await servicesService.getServices({ category, available });
    res.status(200).json(services);
  } catch (error) {
    sendError(res, error);
  }
};

// GET /api/services/:sid
export const getServiceById = async (req, res) => {
  try {
    const service = await servicesService.getServiceById(req.params.sid);
    res.status(200).json(service);
  } catch (error) {
    sendError(res, error);
  }
};

// POST /api/services
export const createService = async (req, res) => {
  try {
    const newService = await servicesService.createService(req.body);
    res.status(201).json(newService);
  } catch (error) {
    sendError(res, error);
  }
};

// PUT /api/services/:sid  (merge parcial, semántica tipo PATCH — ver README)
export const updateService = async (req, res) => {
  try {
    const updated = await servicesService.updateService(req.params.sid, req.body);
    res.status(200).json(updated);
  } catch (error) {
    sendError(res, error);
  }
};

// DELETE /api/services/:sid
export const deleteService = async (req, res) => {
  try {
    const deleted = await servicesService.deleteService(req.params.sid);
    res.status(200).json(deleted);
  } catch (error) {
    sendError(res, error);
  }
};