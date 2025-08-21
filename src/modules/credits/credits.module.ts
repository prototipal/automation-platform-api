import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCredit } from '@/modules/credits/entities';
import { UserCreditsRepository } from '@/modules/credits/repositories';
import { CreditManagementService } from '@/modules/credits/services';
import { SubscriptionEventsListener } from '@/modules/credits/listeners';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCredit]),
  ],
  providers: [
    UserCreditsRepository,
    CreditManagementService,
    SubscriptionEventsListener,
  ],
  exports: [
    UserCreditsRepository,
    CreditManagementService,
  ],
})
export class CreditsModule {}