import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '@/modules/auth/guards';

export const API_KEY_AUTH_KEY = 'apiKeyAuth';

export const ApiKeyAuth = () =>
  applyDecorators(
    SetMetadata(API_KEY_AUTH_KEY, true),
    UseGuards(ApiKeyAuthGuard),
    ApiBearerAuth('ApiKey'),
    ApiUnauthorizedResponse({
      description: 'Invalid or missing API key',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid API key' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Insufficient credits or inactive user',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Insufficient credits' },
          error: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
  );
