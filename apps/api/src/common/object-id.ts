import { Types } from 'mongoose';
import { invalidInput } from './api-error';

export function parseObjectId(value: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value) || String(new Types.ObjectId(value)) !== value) {
    throw invalidInput({ [field]: 'Must be a valid id.' });
  }
  return new Types.ObjectId(value);
}
