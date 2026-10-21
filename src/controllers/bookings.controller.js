import BookingsService from '../services/bookings.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const bookingsService = new BookingsService();

export const createBooking = asyncHandler(async (req, res) => {
  const newBooking = await bookingsService.createBooking(req.validated.body);
  res.status(201).json(newBooking);
});

export const getBookings = asyncHandler(async (req, res) => {
  const result = await bookingsService.getBookings(req.validated.query);
  res.status(200).json(result);
});

export const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingsService.getBookingById(req.params.bid);
  res.status(200).json(booking);
});

export const addServiceToBooking = asyncHandler(async (req, res) => {
  const { bid, sid } = req.validated.params;
  const updatedBooking = await bookingsService.addServiceToBooking(bid, sid);
  res.status(200).json(updatedBooking);
});