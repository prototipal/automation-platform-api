import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthService } from '@/modules/auth/services';
import { ApiKeyAuthGuard, StaticTokenAuthGuard } from '@/modules/auth/guards';

@Module({
  imports: [ConfigModule],
  providers: [
    AuthService,
    ApiKeyAuthGuard,
    StaticTokenAuthGuard,
  ],
  exports: [
    AuthService,
    ApiKeyAuthGuard,
    StaticTokenAuthGuard,
  ],
})
export class AuthModule {}