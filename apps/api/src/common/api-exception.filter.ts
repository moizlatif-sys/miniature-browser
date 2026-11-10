import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorBody } from './api-error';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'INVALID_INPUT',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
};

/** Turns every thrown error into the `{ code, message, fieldErrors? }` shape. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiError');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toBody(exception);
    if (status >= 500) this.logger.error(exception instanceof Error ? exception.stack : exception);
    res.status(status).json(body);
  }

  private toBody(exception: unknown): { status: number; body: ApiErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response && 'code' in response) {
        return { status, body: response as ApiErrorBody };
      }
      return {
        status,
        body: { code: CODE_BY_STATUS[status] ?? 'ERROR', message: exception.message },
      };
    }
    // Mongo driver/Mongoose connection problems: tell the client to retry later,
    // never pretend the page does not exist.
    const name = exception instanceof Error ? exception.name : '';
    if (/Mongo/.test(name)) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: { code: 'DATABASE_UNAVAILABLE', message: 'The database is unavailable. Try again shortly.' },
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' },
    };
  }
}
