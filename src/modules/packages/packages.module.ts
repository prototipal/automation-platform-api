import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PackagesController } from './packages.controller';
import { PackagesService } from './packages.service';
import { PackagesRepository, UserPackagesRepository } from './packages.repository';
import { Package, UserPackage } from '@/modules/packages/entities';
import { UserEventsListener } from '@/modules/packages/listeners';
import { AuthModule } from '@/modules/auth';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package, UserPackage]),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
  ],
  controllers: [PackagesController],
  providers: [
    PackagesService,
    PackagesRepository,
    UserPackagesRepository,
    UserEventsListener,
  ],
  exports: [
    PackagesService,
    PackagesRepository,
    UserPackagesRepository,
  ],
})
export class PackagesModule {}