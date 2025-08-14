import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthService, SupabaseAuthService } from '@/modules/auth/services';
import { ApiKeyAuthGuard, HybridAuthGuard, StaticTokenAuthGuard } from '@/modules/auth/guards';

@Module({
  imports: [ConfigModule],
  providers: [
    AuthService,
    SupabaseAuthService,
    ApiKeyAuthGuard,
    HybridAuthGuard,
    StaticTokenAuthGuard,
  ],
  exports: [
    AuthService,
    SupabaseAuthService,
    ApiKeyAuthGuard,
    HybridAuthGuard,
    StaticTokenAuthGuard,
  ],
})
export class AuthModule {}