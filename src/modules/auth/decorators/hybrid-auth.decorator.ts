import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '@/modules/auth/guards/hybrid-auth.guard';

export const HYBRID_AUTH_KEY = 'hybridAuth';

export const HybridAuth = () =>
  applyDecorators(
    SetMetadata(HYBRID_AUTH_KEY, true),
    UseGuards(HybridAuthGuard),
    ApiBearerAuth('ApiKey'),
    ApiBearerAuth('SupabaseToken'),
    ApiSecurity('ApiKeyHeader'),
    ApiSecurity('SupabaseTokenHeader'),
    ApiUnauthorizedResponse({
      description: 'Invalid or missing API key or Supabase token',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          message: {
            type: 'string',
            example: 'Valid API key or Supabase token is required',
          },
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
