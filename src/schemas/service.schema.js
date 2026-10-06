import { z } from 'zod';
import { requiredText, requiredNumber, requiredBoolean, queryInteger } from './shared.js';

const bodyError = 'El body debe ser un objeto JSON';

const serviceFields = {
  name: requiredText('name'),
  description: requiredText('description'),
  duration: requiredNumber('duration').positive({ error: 'El campo "duration" debe ser un número mayor a 0' }),
  price: requiredNumber('price').min(0, { error: 'El campo "price" debe ser un número mayor o igual a 0' }),
  category: requiredText('category'),
  available: requiredBoolean('available'),
};

export const createServiceSchema = z.object(serviceFields, { error: bodyError });

export const updateServiceSchema = createServiceSchema.partial();

export const SORTABLE_FIELDS = ['name', 'price', 'duration', 'category'];

export const listServicesQuerySchema = z.object({
  category: requiredText('category', 'parámetro').optional(),
  available: z
    .enum(['true', 'false'], { error: 'El parámetro "available" debe ser true o false' })
    .transform((value) => value === 'true')
    .optional(),
  page: queryInteger('page', { min: 1, defaultValue: 1 }),
  limit: queryInteger('limit', { min: 1, max: 100, defaultValue: 10 }),
  sortBy: z
    .enum(SORTABLE_FIELDS, { error: `El parámetro "sortBy" debe ser uno de: ${SORTABLE_FIELDS.join(', ')}` })
    .optional(),
  order: z.enum(['asc', 'desc'], { error: 'El parámetro "order" debe ser asc o desc' }).default('asc'),
});