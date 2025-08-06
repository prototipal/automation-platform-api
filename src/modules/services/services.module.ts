import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { ServicesRepository } from './services.repository';
import { PricingCalculationService } from './services';
import { Service } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Service])],
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository, PricingCalculationService],
  exports: [ServicesService, ServicesRepository, PricingCalculationService],
})
export class ServicesModule {}
