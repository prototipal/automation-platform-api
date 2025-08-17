import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { AuthService } from '@/modules/auth/services';
import { AuthUserDto } from '@/modules/auth/dto';
import {
  InvalidApiKeyException,
  ApiKeyNotFoundException,
  InactiveApiKeyException,
  UserNotFoundException,
  InactiveUserException,
} from '@/modules/auth/exceptions';
import { API_KEY_AUTH_KEY, IS_PUBLIC_KEY } from '@/modules/auth/decorators';

interface AuthenticatedRequest extends Request {
  user?: AuthUserDto;
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiresApiKeyAuth = this.reflector.getAllAndOverride<boolean>(
      API_KEY_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresApiKeyAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      this.logger.warn('API key not provided in request');
      throw new InvalidApiKeyException('API key is required');
    }

    try {
      const user = await this.authService.validateApiKey(apiKey);
      request.user = user;

      this.logger.log(
        `API key authentication successful for user: ${user.user_id}`,
      );
      return true;
    } catch (error) {
      this.logger.warn(`API key authentication failed: ${error.message}`);

      if (
        error instanceof ApiKeyNotFoundException ||
        error instanceof InactiveApiKeyException ||
        error instanceof UserNotFoundException ||
        error instanceof InactiveUserException
      ) {
        throw error;
      }

      throw new InvalidApiKeyException('API key validation failed');
    }
  }

  private extractApiKey(request: AuthenticatedRequest): string | null {
    // Try to extract from Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to extract from X-API-Key header
    const apiKeyHeader = request.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    // Try to extract from query parameter
    const apiKeyQuery = request.query['api_key'] as string;
    if (apiKeyQuery) {
      return apiKeyQuery;
    }

    return null;
  }
}
