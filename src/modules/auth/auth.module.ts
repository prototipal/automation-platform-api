import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import {
  AuthService,
  SupabaseAuthService,
  EnhancedAuthService,
  UserInitializationService,
} from '@/modules/auth/services';
import { CreditsModule } from '@/modules/credits';
import {
  ApiKeyAuthGuard,
  HybridAuthGuard,
  StaticTokenAuthGuard,
} from '@/modules/auth/guards';

@Module({
  imports: [ConfigModule, forwardRef(() => CreditsModule)],
  providers: [
    AuthService,
    SupabaseAuthService,
    EnhancedAuthService,
    UserInitializationService,
    ApiKeyAuthGuard,
    HybridAuthGuard,
    StaticTokenAuthGuard,
  ],
  exports: [
    AuthService,
    SupabaseAuthService,
    EnhancedAuthService,
    UserInitializationService,
    ApiKeyAuthGuard,
    HybridAuthGuard,
    StaticTokenAuthGuard,
  ],
})
export class AuthModule {}
