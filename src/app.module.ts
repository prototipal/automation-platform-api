import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database';
import { HealthModule } from './health';
import { ServicesModule } from '@/modules/services';
import { GenerationsModule } from '@/modules/generations';
import { configModuleOptions } from './config';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    DatabaseModule,
    HealthModule,
    ServicesModule,
    GenerationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
