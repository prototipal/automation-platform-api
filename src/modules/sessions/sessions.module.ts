import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '@/modules/auth';
import { GenerationsModule } from '@/modules/generations';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';
import { Session } from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    AuthModule,
    forwardRef(() => GenerationsModule),
  ],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
  exports: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
