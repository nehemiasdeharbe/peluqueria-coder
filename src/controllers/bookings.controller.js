import BookingsService from '../services/bookings.service.js';

const bookingsService = new BookingsService();

// Los services lanzan errores con .status (400, 404); cualquier otro error es un 500
const sendError = (res, error) =>
  res.status(error.status ?? 500).json({ error: error.message });

// POST /api/bookings  -> crea una reserva, puede iniciarse con services vacío
export const createBooking = async (req, res) => {
  try {
    const newBooking = await bookingsService.createBooking(req.body);
    res.status(201).json(newBooking);
  } catch (error) {
    sendError(res, error);
  }
};

// GET /api/bookings/:bid
export const getBookingById = async (req, res) => {
  try {
    const booking = await bookingsService.getBookingById(req.params.bid);
    res.status(200).json(booking);
  } catch (error) {
    sendError(res, error);
  }
};

// POST /api/bookings/:bid/services/:sid -> agrega (o incrementa) un servicio en la reserva
export const addServiceToBooking = async (req, res) => {
  try {
    const { bid, sid } = req.params;
    const updatedBooking = await bookingsService.addServiceToBooking(bid, sid);
    res.status(200).json(updatedBooking);
  } catch (error) {
    sendError(res, error);
  }
};