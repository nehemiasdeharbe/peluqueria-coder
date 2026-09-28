import { Router } from 'express';
import ServiceManager from '../managers/ServiceManager.js';

const router = Router();
const serviceManager = new ServiceManager();

// GET /api/services  (filtros opcionales: ?category=peluqueria&available=true)
router.get('/', async (req, res) => {
  try {
    const { category, available } = req.query;

    if (available !== undefined && available !== 'true' && available !== 'false') {
      return res.status(400).json({ error: 'El filtro "available" debe ser true o false' });
    }

    const services = await serviceManager.getServices({ category, available });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/services/:sid
router.get('/:sid', async (req, res) => {
  try {
    const { sid } = req.params;
    const service = await serviceManager.getServiceById(sid);

    if (!service) {
      return res.status(404).json({ error: `No existe un servicio con id ${sid}` });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/services
router.post('/', async (req, res) => {
  try {
    const newService = await serviceManager.addService(req.body);
    res.status(201).json(newService);
  } catch (error) {
    // Datos incompletos o inválidos
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/services/:sid
router.put('/:sid', async (req, res) => {
  try {
    const { sid } = req.params;
    const updated = await serviceManager.updateService(sid, req.body);

    if (!updated) {
      return res.status(404).json({ error: `No existe un servicio con id ${sid}` });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/services/:sid
router.delete('/:sid', async (req, res) => {
  try {
    const { sid } = req.params;
    const deleted = await serviceManager.deleteService(sid);

    if (!deleted) {
      return res.status(404).json({ error: `No existe un servicio con id ${sid}` });
    }
    res.status(200).json(deleted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;