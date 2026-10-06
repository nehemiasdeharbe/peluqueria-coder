import { Router } from 'express';
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} from '../controllers/services.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createServiceSchema,
  updateServiceSchema,
  listServicesQuerySchema,
} from '../schemas/service.schema.js';

const router = Router();

router.get('/', validate({ query: listServicesQuerySchema }), getServices);
router.get('/:sid', getServiceById);
router.post('/', validate({ body: createServiceSchema }), createService);
router.put('/:sid', validate({ body: updateServiceSchema }), updateService);
router.delete('/:sid', deleteService);

export default router;