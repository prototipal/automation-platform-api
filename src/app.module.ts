import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database';
import { HealthModule } from './health';
import { ServicesModule } from '@/modules/services';
import { GenerationsModule } from '@/modules/generations';
import { TemplatesModule } from '@/modules/templates';
import { CategoriesModule } from '@/modules/categories';
import { AuthModule } from '@/modules/auth';
import { SessionsModule } from '@/modules/sessions';
import { StorageModule } from '@/modules/storage';
import { PackagesModule } from '@/modules/packages';
import { SubscriptionsModule } from '@/modules/subscriptions';
import { CreditsModule } from '@/modules/credits';
import { configModuleOptions } from './config';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    DatabaseModule,
    HealthModule,
    AuthModule,
    StorageModule,
    SessionsModule,
    ServicesModule,
    GenerationsModule,
    CategoriesModule,
    TemplatesModule,
    PackagesModule,
    SubscriptionsModule,
    CreditsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
