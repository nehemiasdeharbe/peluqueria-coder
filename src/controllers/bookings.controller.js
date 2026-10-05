import BookingManager from '../managers/BookingManager.js';
import ServiceManager from '../managers/ServiceManager.js';

const bookingManager = new BookingManager();
const serviceManager = new ServiceManager();

// POST /api/bookings  -> crea una reserva, puede iniciarse con services vacío
export const createBooking = async (req, res) => {
  try {
    const newBooking = await bookingManager.createBooking(req.body);
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// GET /api/bookings/:bid
export const getBookingById = async (req, res) => {
  try {
    const { bid } = req.params;
    const booking = await bookingManager.getBookingById(bid);

    if (!booking) {
      return res.status(404).json({ error: `No existe una reserva con id ${bid}` });
    }
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/bookings/:bid/services/:sid -> agrega (o incrementa) un servicio en la reserva
export const addServiceToBooking = async (req, res) => {
  try {
    const { bid, sid } = req.params;

    const booking = await bookingManager.getBookingById(bid);
    if (!booking) {
      return res.status(404).json({ error: `No existe una reserva con id ${bid}` });
    }

    const service = await serviceManager.getServiceById(sid);
    if (!service) {
      return res.status(404).json({ error: `No existe un servicio con id ${sid}` });
    }

    const updatedBooking = await bookingManager.addServiceToBooking(bid, sid);
    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};