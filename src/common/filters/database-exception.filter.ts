import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  QueryFailedError,
  EntityNotFoundError,
  CannotCreateEntityIdMapError,
} from 'typeorm';

@Catch(QueryFailedError, EntityNotFoundError, CannotCreateEntityIdMapError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let message = exception.message;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    switch (exception.constructor) {
      case QueryFailedError:
        status = HttpStatus.BAD_REQUEST;
        message = this.handleQueryFailedError(exception);
        break;
      case EntityNotFoundError:
        status = HttpStatus.NOT_FOUND;
        message = 'Entity not found';
        break;
      case CannotCreateEntityIdMapError:
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        message = 'Cannot create entity ID map';
        break;
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Database error occurred';
    }

    this.logger.error(
      `Database exception: ${exception.message}`,
      exception.stack,
      `${request.method} ${request.url}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error: 'Database Error',
    });
  }

  private handleQueryFailedError(exception: QueryFailedError): string {
    const error = exception.driverError as any;

    if (error?.code) {
      switch (error.code) {
        case '23505': // unique_violation
          return 'Resource already exists';
        case '23503': // foreign_key_violation
          return 'Referenced resource does not exist';
        case '23502': // not_null_violation
          return 'Required field is missing';
        case '23514': // check_violation
          return 'Invalid data provided';
        case '42P01': // undefined_table
          return 'Database table not found';
        case '42703': // undefined_column
          return 'Database column not found';
        default:
          return 'Database constraint violation';
      }
    }

    return 'Database query failed';
  }
}
