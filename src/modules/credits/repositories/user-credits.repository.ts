import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { UserCredit } from '@/modules/credits/entities';
import {
  CreditBalance,
  CreditDeductionRequest,
  CreditRefillRequest,
  CreditResetRequest,
} from '@/modules/credits/interfaces';

@Injectable()
export class UserCreditsRepository extends Repository<UserCredit> {
  constructor(@InjectDataSource() private dataSource: DataSource) {
    super(UserCredit, dataSource.createEntityManager());
  }

  /**
   * Find user credits by user ID
   */
  async findByUserId(userId: string): Promise<UserCredit | null> {
    return this.findOne({
      where: { user_id: userId, is_active: true },
    });
  }

  /**
   * Get user credit balance with computed values
   */
  async getCreditBalance(userId: string): Promise<CreditBalance | null> {
    const userCredit = await this.findByUserId(userId);

    if (!userCredit) {
      return null;
    }

    return {
      playground_credits: userCredit.playground_credits,
      api_credits: userCredit.api_credits,
      available_playground_credits: userCredit.available_playground_credits,
      available_api_credits: userCredit.available_api_credits,
      total_available_credits: userCredit.total_available_credits,
      playground_credits_used_current_period:
        userCredit.playground_credits_used_current_period,
      api_credits_used_total: userCredit.api_credits_used_total,
    };
  }

  /**
   * Create initial credit record for new user
   */
  async createUserCredits(
    userId: string,
    initialPlaygroundCredits = 0,
    initialApiCredits = 0,
  ): Promise<UserCredit> {
    const userCredit = this.create({
      user_id: userId,
      playground_credits: initialPlaygroundCredits,
      api_credits: initialApiCredits,
      playground_credits_used_current_period: 0,
      api_credits_used_total: 0,
      balance: initialPlaygroundCredits + initialApiCredits, // For backward compatibility
      is_active: true,
      metadata: {
        created_by: 'system',
        initial_playground_credits: initialPlaygroundCredits,
        initial_api_credits: initialApiCredits,
      },
    });

    return this.save(userCredit);
  }

  /**
   * Atomically deduct credits with row locking
   */
  async deductCreditsAtomic(
    request: CreditDeductionRequest,
    queryRunner?: QueryRunner,
  ): Promise<{ success: boolean; error?: string; updatedCredit?: UserCredit }> {
    const runner = queryRunner || this.dataSource.createQueryRunner();
    const shouldManageTransaction = !queryRunner;

    if (shouldManageTransaction) {
      await runner.connect();
      await runner.startTransaction();
    }

    try {
      // Lock the user credit record
      const userCredit = await runner.manager
        .createQueryBuilder(UserCredit, 'uc')
        .where('uc.user_id = :userId AND uc.is_active = true', {
          userId: request.user_id,
        })
        .setLock('pessimistic_write')
        .getOne();

      if (!userCredit) {
        return { success: false, error: 'User credits not found' };
      }

      const { amount, credit_type } = request;

      // Determine which credits to use
      let usePlaygroundCredits = false;
      let useApiCredits = false;

      if (credit_type === 'playground') {
        if (userCredit.available_playground_credits >= amount) {
          usePlaygroundCredits = true;
        } else {
          return { success: false, error: 'Insufficient playground credits' };
        }
      } else if (credit_type === 'api') {
        if (userCredit.api_credits >= amount) {
          useApiCredits = true;
        } else {
          return { success: false, error: 'Insufficient API credits' };
        }
      } else {
        // Auto-select: try playground first, then API
        if (userCredit.available_playground_credits >= amount) {
          usePlaygroundCredits = true;
        } else if (userCredit.api_credits >= amount) {
          useApiCredits = true;
        } else {
          return {
            success: false,
            error: `Insufficient credits. Available: ${userCredit.total_available_credits}, Required: ${amount}`,
          };
        }
      }

      // Update credits
      if (usePlaygroundCredits) {
        userCredit.playground_credits_used_current_period += amount;
      } else if (useApiCredits) {
        userCredit.api_credits -= amount;
        userCredit.api_credits_used_total += amount;
      }

      // Update legacy balance field for backward compatibility
      userCredit.balance = userCredit.total_available_credits;

      // Update metadata
      const currentMetadata = userCredit.metadata || {};
      userCredit.metadata = {
        ...currentMetadata,
        last_deduction: new Date().toISOString(),
        last_deduction_amount: amount,
        last_deduction_type: usePlaygroundCredits ? 'playground' : 'api',
        last_deduction_description: request.description,
        ...request.metadata,
      };

      // Save the updated record
      const updatedCredit = await runner.manager.save(UserCredit, userCredit);

      if (shouldManageTransaction) {
        await runner.commitTransaction();
      }

      return { success: true, updatedCredit };
    } catch (error) {
      if (shouldManageTransaction) {
        await runner.rollbackTransaction();
      }
      return { success: false, error: `Database error: ${error.message}` };
    } finally {
      if (shouldManageTransaction) {
        await runner.release();
      }
    }
  }

  /**
   * Refill user credits
   */
  async refillCredits(request: CreditRefillRequest): Promise<UserCredit> {
    const userCredit = await this.findByUserId(request.user_id);

    if (!userCredit) {
      throw new Error('User credits not found');
    }

    if (request.playground_credits) {
      userCredit.playground_credits += request.playground_credits;
    }

    if (request.api_credits) {
      userCredit.api_credits += request.api_credits;
    }

    // Update legacy balance field
    userCredit.balance = userCredit.total_available_credits;

    // Update metadata
    const currentMetadata = userCredit.metadata || {};
    userCredit.metadata = {
      ...currentMetadata,
      last_refill: new Date().toISOString(),
      last_refill_playground: request.playground_credits || 0,
      last_refill_api: request.api_credits || 0,
      last_refill_source: request.source,
      last_refill_description: request.description,
      ...request.metadata,
    };

    return this.save(userCredit);
  }

  /**
   * Reset playground credits and optionally usage counters
   */
  async resetPlaygroundCredits(
    request: CreditResetRequest,
  ): Promise<UserCredit> {
    const userCredit = await this.findByUserId(request.user_id);

    if (!userCredit) {
      throw new Error('User credits not found');
    }

    userCredit.playground_credits = request.playground_credits;

    if (request.reset_usage_counters) {
      userCredit.playground_credits_used_current_period = 0;
    }

    userCredit.playground_credits_last_reset = new Date();

    // Update legacy balance field
    userCredit.balance = userCredit.total_available_credits;

    // Update metadata
    const currentMetadata = userCredit.metadata || {};
    userCredit.metadata = {
      ...currentMetadata,
      last_reset: new Date().toISOString(),
      last_reset_amount: request.playground_credits,
      last_reset_source: request.source,
      last_reset_description: request.description,
      usage_counters_reset: request.reset_usage_counters,
      ...request.metadata,
    };

    return this.save(userCredit);
  }

  /**
   * Set next reset date for playground credits
   */
  async setPlaygroundCreditsNextReset(
    userId: string,
    nextResetDate: Date,
  ): Promise<void> {
    await this.update(
      { user_id: userId, is_active: true },
      {
        playground_credits_next_reset: nextResetDate,
        updated_at: new Date(),
      },
    );
  }

  /**
   * Get users whose playground credits should be reset
   */
  async getUsersForPlaygroundReset(): Promise<UserCredit[]> {
    return this.createQueryBuilder('uc')
      .where('uc.is_active = true')
      .andWhere('uc.playground_credits_next_reset IS NOT NULL')
      .andWhere('uc.playground_credits_next_reset <= :now', { now: new Date() })
      .getMany();
  }

  /**
   * Legacy method for backward compatibility
   */
  async getLegacyBalance(userId: string): Promise<number> {
    const userCredit = await this.findByUserId(userId);
    return userCredit?.balance || 0;
  }

  /**
   * Check if user has sufficient credits (either type)
   */
  async hasSufficientCredits(
    userId: string,
    requiredAmount: number,
  ): Promise<boolean> {
    const userCredit = await this.findByUserId(userId);
    return userCredit
      ? userCredit.total_available_credits >= requiredAmount
      : false;
  }

  /**
   * Migrate existing balance to new credit system
   */
  async migrateExistingBalance(userId: string): Promise<UserCredit | null> {
    const userCredit = await this.findByUserId(userId);

    if (!userCredit) {
      return null;
    }

    // If already migrated, skip
    if (userCredit.metadata?.migrated) {
      return userCredit;
    }

    // Move existing balance to playground credits
    const existingBalance = userCredit.balance || 0;
    userCredit.playground_credits = existingBalance;
    userCredit.api_credits = 0;
    userCredit.playground_credits_used_current_period = 0;
    userCredit.api_credits_used_total = 0;

    // Update metadata to track migration
    const currentMetadata = userCredit.metadata || {};
    userCredit.metadata = {
      ...currentMetadata,
      migrated: true,
      migration_date: new Date().toISOString(),
      original_balance: existingBalance,
    };

    return this.save(userCredit);
  }
}
