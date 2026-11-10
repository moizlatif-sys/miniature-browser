import { HttpException, HttpStatus } from '@nestjs/common';

export type FieldErrors = Record<string, string>;

/** Body of every error response: `{ code, message, fieldErrors? }`. */
export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export class ApiError extends HttpException {
  constructor(status: HttpStatus, code: string, message: string, fieldErrors?: FieldErrors) {
    const body: ApiErrorBody = { code, message, ...(fieldErrors ? { fieldErrors } : {}) };
    super(body, status);
  }
}

export const invalidInput = (fieldErrors: FieldErrors, message = 'Some fields are invalid.') =>
  new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_INPUT', message, fieldErrors);
