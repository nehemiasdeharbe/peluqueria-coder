import MessagesService from '../services/messages.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const messagesService = new MessagesService();

export const createMessage = asyncHandler(async (req, res) => {
  const message = await messagesService.createMessage(req.validated.body);
  res.status(201).json(message);
});

export const getMessages = asyncHandler(async (req, res) => {
  const result = await messagesService.getMessages(req.validated.query);
  res.status(200).json(result);
});

export const getMessageById = asyncHandler(async (req, res) => {
  const message = await messagesService.getMessageById(req.params.mid);
  res.status(200).json(message);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const deleted = await messagesService.deleteMessage(req.params.mid);
  res.status(200).json(deleted);
});