import { Router } from 'express';
import {
  createMessage,
  getMessages,
  getMessageById,
  deleteMessage,
} from '../controllers/messages.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createMessageSchema, listMessagesQuerySchema } from '../schemas/message.schema.js';

const router = Router();

router.post('/', validate({ body: createMessageSchema }), createMessage);
router.get('/', validate({ query: listMessagesQuerySchema }), getMessages);
router.get('/:mid', getMessageById);
router.delete('/:mid', deleteMessage);

export default router;