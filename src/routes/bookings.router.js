import { Router } from 'express';
import {
  createBooking,
  getBookings,
  getBookingById,
  addServiceToBooking,
} from '../controllers/bookings.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createBookingSchema,
  listBookingsQuerySchema,
  addServiceToBookingSchema,
} from '../schemas/booking.schema.js';

const router = Router();

router.post('/', validate({ body: createBookingSchema }), createBooking);
router.get('/', validate({ query: listBookingsQuerySchema }), getBookings);
router.get('/:bid', getBookingById);
router.post('/:bid/services/:sid', validate({ params: addServiceToBookingSchema }), addServiceToBooking);

export default router;