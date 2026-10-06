import { z } from 'zod';
import { requiredText, requiredNumber, objectId } from './shared.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const isRealDate = (value) => {
  if (!DATE_REGEX.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const bookingServiceItemSchema = z.object(
  {
    service: objectId('service'),
    quantity: requiredNumber('quantity')
      .int({ error: 'El campo "quantity" debe ser un número entero' })
      .min(1, { error: 'El campo "quantity" debe ser mayor o igual a 1' })
      .default(1),
  },
  { error: 'Cada elemento de "services" debe ser un objeto { service, quantity }' }
);

export const createBookingSchema = z.object(
  {
    clientName: requiredText('clientName'),
    clientEmail: requiredText('clientEmail').regex(EMAIL_REGEX, {
      error: 'El campo "clientEmail" no tiene un formato válido',
    }),
    date: requiredText('date').refine(isRealDate, {
      error: 'El campo "date" debe tener formato YYYY-MM-DD y ser una fecha real',
    }),
    time: requiredText('time').regex(TIME_REGEX, { error: 'El campo "time" debe tener formato HH:mm (24 hs)' }),
    status: requiredText('status').optional(),
    services: z.array(bookingServiceItemSchema, { error: 'El campo "services" debe ser un array' }).default([]),
  },
  { error: 'El body debe ser un objeto JSON' }
);

export const addServiceToBookingSchema = z.object({
  bid: objectId('bid', 'parámetro'),
  sid: objectId('sid', 'parámetro'),
});