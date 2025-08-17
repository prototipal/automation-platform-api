import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Template } from './entities';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { TemplatesRepository } from './templates.repository';
import { CategoriesModule } from '@/modules/categories';

@Module({
  imports: [TypeOrmModule.forFeature([Template]), CategoriesModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplatesRepository],
  exports: [TemplatesService, TemplatesRepository],
})
export class TemplatesModule {}
