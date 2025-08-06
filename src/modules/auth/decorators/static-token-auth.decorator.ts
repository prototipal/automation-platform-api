import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { StaticTokenAuthGuard } from '@/modules/auth/guards';

export const STATIC_TOKEN_AUTH_KEY = 'staticTokenAuth';

export const StaticTokenAuth = () =>
  applyDecorators(
    SetMetadata(STATIC_TOKEN_AUTH_KEY, true),
    UseGuards(StaticTokenAuthGuard),
    ApiBearerAuth('StaticToken'),
    ApiUnauthorizedResponse({
      description: 'Invalid or missing static token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid static token' },
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
  );