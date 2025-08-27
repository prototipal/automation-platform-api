import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import {
  AuthUserDto,
  CreditDeductionDto,
  CreditDeductionResponseDto,
} from '@/modules/auth/dto';
import {
  ApiKeyNotFoundException,
  InactiveApiKeyException,
  UserNotFoundException,
  InactiveUserException,
  InsufficientCreditsException,
  CreditDeductionFailedException,
} from '@/modules/auth/exceptions';
import { CreditManagementService } from '@/modules/credits/services';
import { CreditType } from '@/modules/credits/enums';

@Injectable()
export class EnhancedAuthService {
  private readonly logger = new Logger(EnhancedAuthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly creditManagementService: CreditManagementService,
  ) {}

  /**
   * Validates API key and returns user information with credits
   */
  async validateApiKey(keyValue: string): Promise<AuthUserDto> {
    this.logger.log(`Validating API key: ${keyValue.substring(0, 8)}...`);

    // Find API key using raw SQL for better performance
    const apiKeyResult = await this.dataSource.query(
      `SELECT ak.id, ak.user_id, ak.is_active, ak.key_value 
       FROM api_keys ak 
       WHERE ak.key_value = $1`,
      [keyValue],
    );

    if (!apiKeyResult || apiKeyResult.length === 0) {
      this.logger.warn(`API key not found: ${keyValue.substring(0, 8)}...`);
      throw new ApiKeyNotFoundException();
    }

    const apiKey = apiKeyResult[0];
    if (!apiKey.is_active) {
      this.logger.warn(`Inactive API key: ${keyValue.substring(0, 8)}...`);
      throw new InactiveApiKeyException();
    }

    // Get user profile
    const userDataResult = await this.dataSource.query(
      `SELECT 
         up.id as user_id,
         up.email,
         up.full_name as name,
         CASE WHEN up.id IS NOT NULL THEN true ELSE false END as user_active
       FROM user_profiles up 
       WHERE up.id = $1`,
      [apiKey.user_id],
    );

    if (!userDataResult || userDataResult.length === 0) {
      this.logger.warn(`User not found for user_id: ${apiKey.user_id}`);
      throw new UserNotFoundException();
    }

    const userData = userDataResult[0];
    if (!userData.user_active) {
      this.logger.warn(`Inactive user: ${apiKey.user_id}`);
      throw new InactiveUserException();
    }

    // Get user credit balance using new credit system
    const creditBalance = await this.creditManagementService.getCreditBalance(
      apiKey.user_id,
    );
    const totalBalance = creditBalance?.total_available_credits || 0;

    this.logger.log(
      `API key validated successfully for user: ${apiKey.user_id}`,
    );

    return plainToInstance(AuthUserDto, {
      user_id: userData.user_id,
      balance: totalBalance,
      email: userData.email,
      name: userData.name,
    });
  }

  /**
   * Checks if user has sufficient credits for the requested amount
   */
  async checkSufficientCredits(
    userId: string,
    requiredAmount: number,
    creditType?: CreditType,
  ): Promise<boolean> {
    return this.creditManagementService.hasSufficientCredits(
      userId,
      requiredAmount,
      creditType,
    );
  }

  /**
   * Deducts credits from user account using the new credit management system
   */
  async deductCredits(
    deductionDto: CreditDeductionDto,
  ): Promise<CreditDeductionResponseDto> {
    const { user_id, amount, description, credit_type } = deductionDto;

    this.logger.log(`Deducting ${amount} credits from user: ${user_id}`);

    try {
      const result = await this.creditManagementService.deductCredits({
        user_id,
        amount,
        credit_type: credit_type,
        description,
        metadata: {
          source: 'api_usage',
          timestamp: new Date().toISOString(),
        },
      });

      if (!result.success) {
        this.logger.warn(
          `Credit deduction failed for user ${user_id}: ${result.error}`,
        );
        throw new InsufficientCreditsException();
      }

      const totalRemainingBalance =
        result.remaining_playground_credits + result.remaining_api_credits;

      this.logger.log(
        `Successfully deducted ${amount} credits from user ${user_id}. ` +
          `Remaining: playground=${result.remaining_playground_credits}, api=${result.remaining_api_credits}`,
      );

      return plainToInstance(CreditDeductionResponseDto, {
        success: true,
        remaining_balance: totalRemainingBalance,
        deducted_amount: amount,
        credit_type_used: result.credit_type_used,
        remaining_playground_credits: result.remaining_playground_credits,
        remaining_api_credits: result.remaining_api_credits,
      });
    } catch (error) {
      this.logger.error(`Failed to deduct credits for user ${user_id}:`, error);

      if (error instanceof InsufficientCreditsException) {
        throw error;
      }

      throw new CreditDeductionFailedException(
        `Credit deduction failed: ${error.message}`,
      );
    }
  }

  /**
   * Gets current user credits balance (legacy method for backward compatibility)
   */
  async getUserBalance(userId: string): Promise<number> {
    const creditBalance =
      await this.creditManagementService.getCreditBalance(userId);
    return creditBalance?.total_available_credits || 0;
  }

  /**
   * Gets detailed user credit balance (new method)
   */
  async getUserCreditBalance(userId: string) {
    return this.creditManagementService.getCreditBalance(userId);
  }

  /**
   * Gets user credit usage report
   */
  async getUserCreditUsageReport(userId: string) {
    return this.creditManagementService.getCreditUsageReport(userId);
  }

  /**
   * Validates if user exists and is active
   */
  async validateUser(userId: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT CASE WHEN up.id IS NOT NULL THEN true ELSE false END as is_active 
       FROM user_profiles up 
       WHERE up.id = $1`,
      [userId],
    );

    return result && result.length > 0 && result[0].is_active;
  }

  /**
   * Create credit record for new user
   */
  async createUserCredits(
    userId: string,
    initialPlaygroundCredits = 0,
    initialApiCredits = 0,
  ): Promise<void> {
    await this.creditManagementService.createUserCredits(
      userId,
      initialPlaygroundCredits,
      initialApiCredits,
    );
  }

  /**
   * Migrate user from legacy credit system to new system
   */
  async migrateUserCredits(userId: string): Promise<void> {
    await this.creditManagementService.migrateUserCredits(userId);
  }

  // Legacy methods for backward compatibility

  /**
   * Legacy method - uses new credit system under the hood
   * @deprecated Use checkSufficientCredits with creditType parameter instead
   */
  async checkSufficientApiCredits(
    userId: string,
    requiredAmount: number,
  ): Promise<boolean> {
    return this.checkSufficientCredits(userId, requiredAmount, CreditType.API);
  }

  /**
   * Legacy method - uses new credit system under the hood
   * @deprecated Use checkSufficientCredits with creditType parameter instead
   */
  async checkSufficientPlaygroundCredits(
    userId: string,
    requiredAmount: number,
  ): Promise<boolean> {
    return this.checkSufficientCredits(
      userId,
      requiredAmount,
      CreditType.PLAYGROUND,
    );
  }
}
