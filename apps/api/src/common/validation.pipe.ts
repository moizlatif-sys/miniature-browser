import { ValidationError, ValidationPipe } from '@nestjs/common';
import { FieldErrors, invalidInput } from './api-error';

/** DTO validation that reports `fieldErrors: { field: message }`. */
export function createValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) => {
      const fieldErrors: FieldErrors = {};
      for (const error of errors) {
        const first = Object.values(error.constraints ?? {})[0];
        fieldErrors[error.property] = first ?? 'Invalid value.';
      }
      return invalidInput(fieldErrors);
    },
  });
}
