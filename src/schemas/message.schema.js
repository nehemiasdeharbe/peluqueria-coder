import { z } from 'zod';
import { requiredText, requiredEmail, queryInteger } from './shared.js';

export const createMessageSchema = z.object(
  {
    clientName: requiredText('clientName'),
    clientEmail: requiredEmail('clientEmail'),
    message: requiredText('message').max(1000, {
      error: 'El campo "message" no puede superar los 1000 caracteres',
    }),
  },
  { error: 'El body debe ser un objeto JSON' }
);

export const listMessagesQuerySchema = z.object({
  page: queryInteger('page', { min: 1, defaultValue: 1 }),
  limit: queryInteger('limit', { min: 1, max: 100, defaultValue: 10 }),
});