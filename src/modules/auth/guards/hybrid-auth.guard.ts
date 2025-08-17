import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { AuthService } from '@/modules/auth/services/auth.service';
import { SupabaseAuthService } from '@/modules/auth/services/supabase-auth.service';
import { AuthUserDto } from '@/modules/auth/dto';
import {
  InvalidApiKeyException,
  InvalidSupabaseTokenException,
} from '@/modules/auth/exceptions';
import { HYBRID_AUTH_KEY, IS_PUBLIC_KEY } from '@/modules/auth/decorators';

interface AuthenticatedRequest extends Request {
  user?: AuthUserDto;
}

interface ExtractedTokens {
  apiKey?: string;
  supabaseToken?: string;
}

@Injectable()
export class HybridAuthGuard implements CanActivate {
  private readonly logger = new Logger(HybridAuthGuard.name);

  constructor(
    private readonly authService: AuthService,
    private readonly supabaseAuthService: SupabaseAuthService,
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

    const requiresHybridAuth = this.reflector.getAllAndOverride<boolean>(
      HYBRID_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiresHybridAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tokens = this.extractTokens(request);

    // Try API key authentication first
    if (tokens.apiKey) {
      const apiKeyResult = await this.tryApiKeyAuth(tokens.apiKey);
      if (apiKeyResult.success) {
        request.user = apiKeyResult.user;
        this.logger.log(
          `API key authentication successful for user: ${apiKeyResult.user.user_id}`,
        );
        return true;
      }
    }

    // Try Supabase token authentication
    if (tokens.supabaseToken) {
      const supabaseResult = await this.trySupabaseAuth(tokens.supabaseToken);
      if (supabaseResult.success) {
        request.user = supabaseResult.user;
        this.logger.log(
          `Supabase token authentication successful for user: ${supabaseResult.user.user_id}`,
        );
        return true;
      }
    }

    // If no valid authentication method found
    this.logger.warn('No valid authentication method provided');
    throw new InvalidApiKeyException(
      'Valid API key or Supabase token is required',
    );
  }

  private extractTokens(request: AuthenticatedRequest): ExtractedTokens {
    const tokens: ExtractedTokens = {};

    // Extract from Authorization header (could be either API key or Supabase token)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Determine if it's a Supabase JWT or API key
      if (this.supabaseAuthService.isSupabaseToken(token)) {
        tokens.supabaseToken = token;
      } else {
        tokens.apiKey = token;
      }
    }

    // Extract from dedicated headers
    const apiKeyHeader = request.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      tokens.apiKey = apiKeyHeader;
    }

    const supabaseTokenHeader = request.headers['x-supabase-token'] as string;
    if (supabaseTokenHeader) {
      tokens.supabaseToken = supabaseTokenHeader;
    }

    // Extract from query parameters
    const apiKeyQuery = request.query['api_key'] as string;
    if (apiKeyQuery) {
      tokens.apiKey = apiKeyQuery;
    }

    const supabaseTokenQuery = request.query['supabase_token'] as string;
    if (supabaseTokenQuery) {
      tokens.supabaseToken = supabaseTokenQuery;
    }

    return tokens;
  }

  private async tryApiKeyAuth(
    apiKey: string,
  ): Promise<{ success: boolean; user?: AuthUserDto }> {
    try {
      const user = await this.authService.validateApiKey(apiKey);
      return { success: true, user };
    } catch (error) {
      this.logger.debug(`API key authentication failed: ${error.message}`);
      return { success: false };
    }
  }

  private async trySupabaseAuth(
    token: string,
  ): Promise<{ success: boolean; user?: AuthUserDto }> {
    try {
      const user = await this.supabaseAuthService.validateSupabaseToken(token);
      return { success: true, user };
    } catch (error) {
      this.logger.debug(
        `Supabase token authentication failed: ${error.message}`,
      );
      return { success: false };
    }
  }
}
