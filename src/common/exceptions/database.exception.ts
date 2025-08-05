import { HttpException, HttpStatus } from '@nestjs/common';

export class DatabaseConnectionException extends HttpException {
  constructor(message?: string) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: message || 'Database connection failed',
        error: 'Database Connection Error',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class DatabaseValidationException extends HttpException {
  constructor(message?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: message || 'Database validation failed',
        error: 'Database Validation Error',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
