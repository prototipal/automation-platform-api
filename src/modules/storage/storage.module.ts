import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

import supabaseConfig from '@/config/supabase.config';
import { StorageService } from './storage.service';

@Module({
  imports: [
    ConfigModule.forFeature(supabaseConfig),
    HttpModule.register({
      timeout: 60000, // 60 seconds for file downloads
      maxRedirects: 5,
      maxContentLength: 50 * 1024 * 1024, // 50MB max content length
      headers: {
        'User-Agent': 'AutomationPlatform/1.0',
      },
    }),
  ],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}