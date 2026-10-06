import BookingsService from '../services/bookings.service.js';

const bookingsService = new BookingsService();

const sendError = (res, error) =>
  res.status(error.status ?? 500).json({ error: error.message });

export const createBooking = async (req, res) => {
  try {
    const newBooking = await bookingsService.createBooking(req.validated.body);
    res.status(201).json(newBooking);
  } catch (error) {
    sendError(res, error);
  }
};

export const getBookingById = async (req, res) => {
  try {
    const booking = await bookingsService.getBookingById(req.params.bid);
    res.status(200).json(booking);
  } catch (error) {
    sendError(res, error);
  }
};

export const addServiceToBooking = async (req, res) => {
  try {
    const { bid, sid } = req.validated.params;
    const updatedBooking = await bookingsService.addServiceToBooking(bid, sid);
    res.status(200).json(updatedBooking);
  } catch (error) {
    sendError(res, error);
  }
};