import { isObjectIdOrHexString } from 'mongoose';

export const isValidId = (id) => typeof id === 'string' && isObjectIdOrHexString(id);

export const toPlain = (doc) => {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { id: String(_id), ...rest };
};