import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, QueryRunner } from 'typeorm';
import { UserCreditsRepository } from '@/modules/credits/repositories';
import { 
  CreditBalance, 
  CreditDeductionRequest, 
  CreditDeductionResult,
  CreditRefillRequest,
  CreditResetRequest,
  CreditUsageReport,
  SubscriptionCreditSettings 
} from '@/modules/credits/interfaces';
import { CreditType, CreditSource, CreditOperation } from '@/modules/credits/enums';

@Injectable()
export class CreditManagementService {
  private readonly logger = new Logger(CreditManagementService.name);

  constructor(
    private readonly userCreditsRepository: UserCreditsRepository,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get user's credit balance
   */
  async getCreditBalance(userId: string): Promise<CreditBalance | null> {
    try {
      const balance = await this.userCreditsRepository.getCreditBalance(userId);
      
      if (!balance) {
        this.logger.warn(`Credit balance not found for user: ${userId}`);
        return null;
      }

      return balance;
    } catch (error) {
      this.logger.error(`Error getting credit balance for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(request: CreditDeductionRequest): Promise<CreditDeductionResult> {
    try {
      this.logger.log(`Deducting ${request.amount} credits from user ${request.user_id}`);

      const result = await this.userCreditsRepository.deductCreditsAtomic(request);

      if (!result.success) {
        this.logger.warn(`Credit deduction failed for user ${request.user_id}: ${result.error}`);
        return {
          success: false,
          deducted_amount: 0,
          remaining_playground_credits: 0,
          remaining_api_credits: 0,
          credit_type_used: request.credit_type || CreditType.PLAYGROUND,
          error: result.error,
        };
      }

      const updatedCredit = result.updatedCredit!;
      const creditTypeUsed = updatedCredit.metadata?.last_deduction_type === 'api' 
        ? CreditType.API 
        : CreditType.PLAYGROUND;

      // Emit credit deduction event
      this.eventEmitter.emit('credit.deducted', {
        user_id: request.user_id,
        amount: request.amount,
        credit_type: creditTypeUsed,
        remaining_playground_credits: updatedCredit.available_playground_credits,
        remaining_api_credits: updatedCredit.available_api_credits,
        description: request.description,
        metadata: request.metadata,
      });

      this.logger.log(
        `Successfully deducted ${request.amount} ${creditTypeUsed} credits from user ${request.user_id}. ` +
        `Remaining: playground=${updatedCredit.available_playground_credits}, api=${updatedCredit.available_api_credits}`
      );

      return {
        success: true,
        deducted_amount: request.amount,
        remaining_playground_credits: updatedCredit.available_playground_credits,
        remaining_api_credits: updatedCredit.available_api_credits,
        credit_type_used: creditTypeUsed,
      };

    } catch (error) {
      this.logger.error(`Error deducting credits for user ${request.user_id}:`, error);
      return {
        success: false,
        deducted_amount: 0,
        remaining_playground_credits: 0,
        remaining_api_credits: 0,
        credit_type_used: request.credit_type || CreditType.PLAYGROUND,
        error: `System error: ${error.message}`,
      };
    }
  }

  /**
   * Refill user credits
   */
  async refillCredits(request: CreditRefillRequest): Promise<void> {
    try {
      this.logger.log(
        `Refilling credits for user ${request.user_id}: ` +
        `playground=${request.playground_credits || 0}, api=${request.api_credits || 0}`
      );

      const updatedCredit = await this.userCreditsRepository.refillCredits(request);

      // Emit credit refill event
      this.eventEmitter.emit('credit.refilled', {
        user_id: request.user_id,
        playground_credits_added: request.playground_credits || 0,
        api_credits_added: request.api_credits || 0,
        source: request.source,
        new_playground_balance: updatedCredit.playground_credits,
        new_api_balance: updatedCredit.api_credits,
        description: request.description,
        metadata: request.metadata,
      });

      this.logger.log(
        `Successfully refilled credits for user ${request.user_id}. ` +
        `New balances: playground=${updatedCredit.playground_credits}, api=${updatedCredit.api_credits}`
      );

    } catch (error) {
      this.logger.error(`Error refilling credits for user ${request.user_id}:`, error);
      throw error;
    }
  }

  /**
   * Reset playground credits for subscription period
   */
  async resetPlaygroundCredits(request: CreditResetRequest): Promise<void> {
    try {
      this.logger.log(
        `Resetting playground credits for user ${request.user_id} to ${request.playground_credits}`
      );

      const updatedCredit = await this.userCreditsRepository.resetPlaygroundCredits(request);

      // Emit credit reset event
      this.eventEmitter.emit('credit.reset', {
        user_id: request.user_id,
        new_playground_credits: request.playground_credits,
        usage_counters_reset: request.reset_usage_counters,
        source: request.source,
        description: request.description,
        metadata: request.metadata,
      });

      this.logger.log(
        `Successfully reset playground credits for user ${request.user_id} to ${request.playground_credits}`
      );

    } catch (error) {
      this.logger.error(`Error resetting playground credits for user ${request.user_id}:`, error);
      throw error;
    }
  }

  /**
   * Handle subscription period start - reset playground credits
   */
  async handleSubscriptionPeriodStart(
    userId: string, 
    packageId: number, 
    packageName: string,
    monthlyCredits: number,
    periodStart: Date, 
    periodEnd: Date
  ): Promise<void> {
    try {
      this.logger.log(`🔄 STARTING SUBSCRIPTION PERIOD for user ${userId}`);
      this.logger.log(`📦 Package: ${packageName} (${packageId}), Credits: ${monthlyCredits}`);
      this.logger.log(`📅 Period: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);

      // Reset playground credits to package allocation
      await this.resetPlaygroundCredits({
        user_id: userId,
        playground_credits: monthlyCredits,
        reset_usage_counters: true,
        source: CreditSource.SUBSCRIPTION_RESET,
        description: `Monthly playground credit reset for ${packageName}`,
        metadata: {
          package_id: packageId,
          package_name: packageName,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
        },
      });

      // Set next reset date
      await this.userCreditsRepository.setPlaygroundCreditsNextReset(userId, periodEnd);

      this.logger.log(
        `Handled subscription period start for user ${userId}: ` +
        `reset playground credits to ${monthlyCredits}, next reset: ${periodEnd.toISOString()}`
      );

    } catch (error) {
      this.logger.error(`Error handling subscription period start for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Handle subscription cancellation - reset playground credits to 0
   */
  async handleSubscriptionCancellation(userId: string, packageId: number): Promise<void> {
    try {
      this.logger.log(`Handling subscription cancellation for user ${userId}, package ${packageId}`);

      // Reset playground credits to 0, but keep API credits
      await this.resetPlaygroundCredits({
        user_id: userId,
        playground_credits: 0,
        reset_usage_counters: false, // Keep usage history for analytics
        source: CreditSource.SUBSCRIPTION_RESET,
        description: 'Playground credits reset due to subscription cancellation',
        metadata: {
          package_id: packageId,
          cancellation_date: new Date().toISOString(),
        },
      });

      // Clear next reset date
      await this.userCreditsRepository.setPlaygroundCreditsNextReset(userId, null as any);

      this.logger.log(`Successfully handled subscription cancellation for user ${userId}`);

    } catch (error) {
      this.logger.error(`Error handling subscription cancellation for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if user has sufficient credits
   */
  async hasSufficientCredits(userId: string, requiredAmount: number, creditType?: CreditType): Promise<boolean> {
    try {
      const balance = await this.getCreditBalance(userId);
      
      if (!balance) {
        return false;
      }

      if (creditType === CreditType.PLAYGROUND) {
        return balance.available_playground_credits >= requiredAmount;
      } else if (creditType === CreditType.API) {
        return balance.available_api_credits >= requiredAmount;
      } else {
        // Check total available credits
        return balance.total_available_credits >= requiredAmount;
      }

    } catch (error) {
      this.logger.error(`Error checking credit sufficiency for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user credit usage report
   */
  async getCreditUsageReport(userId: string): Promise<CreditUsageReport | null> {
    try {
      const userCredit = await this.userCreditsRepository.findByUserId(userId);

      if (!userCredit) {
        return null;
      }

      return {
        user_id: userId,
        current_period_start: userCredit.playground_credits_last_reset,
        current_period_end: userCredit.playground_credits_next_reset,
        playground_credits_allocated: userCredit.playground_credits,
        playground_credits_used: userCredit.playground_credits_used_current_period,
        playground_credits_remaining: userCredit.available_playground_credits,
        api_credits_total: userCredit.api_credits,
        api_credits_used_lifetime: userCredit.api_credits_used_total,
        api_credits_remaining: userCredit.api_credits,
      };

    } catch (error) {
      this.logger.error(`Error getting credit usage report for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create initial credit record for new user
   */
  async createUserCredits(
    userId: string, 
    initialPlaygroundCredits = 0, 
    initialApiCredits = 0
  ): Promise<void> {
    try {
      await this.userCreditsRepository.createUserCredits(
        userId, 
        initialPlaygroundCredits, 
        initialApiCredits
      );

      this.eventEmitter.emit('credit.created', {
        user_id: userId,
        initial_playground_credits: initialPlaygroundCredits,
        initial_api_credits: initialApiCredits,
      });

      this.logger.log(
        `Created credit record for user ${userId}: ` +
        `playground=${initialPlaygroundCredits}, api=${initialApiCredits}`
      );

    } catch (error) {
      this.logger.error(`Error creating credit record for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Migrate existing user balance to new credit system
   */
  async migrateUserCredits(userId: string): Promise<void> {
    try {
      const result = await this.userCreditsRepository.migrateExistingBalance(userId);
      
      if (result) {
        this.eventEmitter.emit('credit.migrated', {
          user_id: userId,
          original_balance: result.metadata?.original_balance || 0,
          new_playground_credits: result.playground_credits,
          migration_date: result.metadata?.migration_date,
        });

        this.logger.log(`Successfully migrated credits for user ${userId}`);
      }

    } catch (error) {
      this.logger.error(`Error migrating credits for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async getLegacyBalance(userId: string): Promise<number> {
    return this.userCreditsRepository.getLegacyBalance(userId);
  }

  /**
   * Process periodic playground credit resets
   * NOTE: This method is disabled as we now use webhook-based credit management
   */
  async processScheduledPlaygroundResets(): Promise<void> {
    this.logger.log('Scheduled playground resets are disabled - using webhook-based credit management');
    // This functionality is now handled by webhook events (payment.succeeded)
    // when Stripe sends billing cycle notifications
  }
}