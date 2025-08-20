import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServicesModule } from '@/modules/services';
import { AuthModule } from '@/modules/auth';
import { StorageModule } from '@/modules/storage';
import { SessionsModule } from '@/modules/sessions';
import { PackagesModule } from '@/modules/packages';
import { GenerationsController } from './generations.controller';
import { GenerationsService } from './generations.service';
import { GenerationsRepository } from './generations.repository';
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
    PackagesModule,
    forwardRef(() => SessionsModule),
  ],
  controllers: [GenerationsController],
  providers: [GenerationsService, GenerationsRepository],
  exports: [GenerationsService, GenerationsRepository],
})
export class GenerationsModule {}
