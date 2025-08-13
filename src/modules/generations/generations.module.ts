import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServicesModule } from '@/modules/services';
import { AuthModule } from '@/modules/auth';
import { StorageModule } from '@/modules/storage';
import { SessionsModule } from '@/modules/sessions';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { Generation } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Generation]),
    HttpModule.register({
      timeout: 60000, // 60 seconds timeout for long-running generation requests
      maxRedirects: 5,
    }),
    ConfigModule,
    ServicesModule,
    AuthModule,
    StorageModule,
    SessionsModule,
  ],
  controllers: [GenerationsController],
  providers: [GenerationsService],
  exports: [GenerationsService],
})
export class GenerationsModule {}