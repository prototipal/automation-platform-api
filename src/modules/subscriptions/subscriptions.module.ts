import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { SubscriptionsController } from './subscriptions.controller';
import { StripeService, WebhookService } from '@/modules/subscriptions/services';
import { PackagesModule } from '@/modules/packages';
import { AuthModule } from '@/modules/auth';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PackagesModule,
    AuthModule,
  ],
  controllers: [SubscriptionsController],
  providers: [
    StripeService,
    WebhookService,
  ],
  exports: [
    StripeService,
    WebhookService,
  ],
})
export class SubscriptionsModule {}