import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import {
  InvalidStaticTokenException,
} from '@/modules/auth/exceptions';
import { STATIC_TOKEN_AUTH_KEY, IS_PUBLIC_KEY } from '@/modules/auth/decorators';

@Injectable()
export class StaticTokenAuthGuard implements CanActivate {
  private readonly logger = new Logger(StaticTokenAuthGuard.name);
  private readonly staticToken: string;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.staticToken = this.configService.get<string>('STATIC_AUTH_TOKEN') || '';
    
    if (!this.staticToken) {
      this.logger.warn('STATIC_AUTH_TOKEN is not configured');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiresStaticTokenAuth = this.reflector.getAllAndOverride<boolean>(STATIC_TOKEN_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresStaticTokenAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedToken = this.extractToken(request);

    if (!providedToken) {
      this.logger.warn('Static token not provided in request');
      throw new InvalidStaticTokenException('Static token is required');
    }

    if (!this.staticToken) {
      this.logger.error('Static token is not configured on server');
      throw new InvalidStaticTokenException('Authentication is not properly configured');
    }

    if (providedToken !== this.staticToken) {
      this.logger.warn('Invalid static token provided');
      throw new InvalidStaticTokenException('Invalid static token');
    }

    this.logger.log('Static token authentication successful');
    return true;
  }

  private extractToken(request: Request): string | null {
    // Try to extract from Authorization header (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to extract from X-Static-Token header
    const tokenHeader = request.headers['x-static-token'] as string;
    if (tokenHeader) {
      return tokenHeader;
    }

    // Try to extract from query parameter
    const tokenQuery = request.query['static_token'] as string;
    if (tokenQuery) {
      return tokenQuery;
    }

    return null;
  }
}