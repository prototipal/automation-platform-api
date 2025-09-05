import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { NotificationService } from './services';
import { VideoGenerationListener } from './listeners';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
  ],
  providers: [
    NotificationService,
    VideoGenerationListener,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}