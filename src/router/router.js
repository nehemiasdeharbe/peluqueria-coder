import { Router } from 'express';
import ServiceManager from '../managers/ServiceManager.js';

const router = Router();
const serviceManager = new ServiceManager();

router.get('/', async (req, res) => {
  try {
    const services = await serviceManager.getServices();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const service = await serviceManager.getServiceById(req.params.id);
    if (!service) return res.status(404).json({ error: `No existe un servicio con id ${req.params.id}` });
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newService = await serviceManager.addService(req.body);
    res.status(201).json(newService);
  } catch (error) {
    res.status(400).json({ error: error.message }); // error de validación
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await serviceManager.updateService(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: `No existe un servicio con id ${req.params.id}` });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await serviceManager.deleteService(req.params.id);
    if (!deleted) return res.status(404).json({ error: `No existe un servicio con id ${req.params.id}` });
    res.status(200).json(deleted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;