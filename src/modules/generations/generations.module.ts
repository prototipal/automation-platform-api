import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { ServicesModule } from '@/modules/services';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000, // 60 seconds timeout for long-running generation requests
      maxRedirects: 5,
    }),
    ConfigModule,
    ServicesModule,
  ],
  controllers: [GenerationsController],
  providers: [GenerationsService],
  exports: [GenerationsService],
})
export class GenerationsModule {}