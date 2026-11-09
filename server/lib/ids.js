import mongoose from 'mongoose';

export function isObjectId(value) {
  return typeof value === 'string' && mongoose.isValidObjectId(value);
}

export function objectId(value) {
  return isObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
