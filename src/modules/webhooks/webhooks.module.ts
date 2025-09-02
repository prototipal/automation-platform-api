import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { GenerationsModule } from '@/modules/generations';
import { StorageModule } from '@/modules/storage';
import { CreditsModule } from '@/modules/credits';
import { PackagesModule } from '@/modules/packages';

import { WebhooksController } from './webhooks.controller';
import { ReplicateWebhookService } from './services';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    GenerationsModule,
    StorageModule,
    CreditsModule,
    PackagesModule,
  ],
  controllers: [WebhooksController],
  providers: [ReplicateWebhookService],
  exports: [ReplicateWebhookService],
})
export class WebhooksModule {}