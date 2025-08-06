import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { AuthUserDto, CreditDeductionDto, CreditDeductionResponseDto } from '@/modules/auth/dto';
import {
  ApiKeyNotFoundException,
  InactiveApiKeyException,
  UserNotFoundException,
  InactiveUserException,
  InsufficientCreditsException,
  CreditDeductionFailedException,
} from '@/modules/auth/exceptions';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dataSource: DataSource,
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

    // Get user credits and profile using raw SQL
    const userDataResult = await this.dataSource.query(
      `SELECT 
         uc.user_id,
         uc.balance,
         up.email,
         up.full_name as name,
         CASE WHEN up.id IS NOT NULL THEN true ELSE false END as user_active
       FROM user_credits uc
       LEFT JOIN user_profiles up ON uc.user_id = up.id
       WHERE uc.user_id = $1`,
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

    this.logger.log(`API key validated successfully for user: ${apiKey.user_id}`);
    
    return plainToInstance(AuthUserDto, {
      user_id: userData.user_id,
      balance: parseFloat(userData.balance),
      email: userData.email,
      name: userData.name,
    });
  }

  /**
   * Checks if user has sufficient credits for the requested amount
   */
  async checkSufficientCredits(userId: number, requiredAmount: number): Promise<boolean> {
    const creditResult = await this.dataSource.query(
      `SELECT balance FROM user_credits WHERE user_id = $1`,
      [userId],
    );

    if (!creditResult || creditResult.length === 0) {
      return false;
    }

    const currentBalance = parseFloat(creditResult[0].balance);
    return currentBalance >= requiredAmount;
  }

  /**
   * Deducts credits from user account with transaction safety
   */
  async deductCredits(deductionDto: CreditDeductionDto): Promise<CreditDeductionResponseDto> {
    const { user_id, amount, description } = deductionDto;
    
    this.logger.log(`Deducting ${amount} credits from user: ${user_id}`);

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check current balance with row locking
      const balanceResult = await queryRunner.query(
        `SELECT balance FROM user_credits WHERE user_id = $1 FOR UPDATE`,
        [user_id],
      );

      if (!balanceResult || balanceResult.length === 0) {
        throw new UserNotFoundException();
      }

      const currentBalance = parseFloat(balanceResult[0].balance);
      
      if (currentBalance < amount) {
        this.logger.warn(`Insufficient credits for user ${user_id}. Required: ${amount}, Available: ${currentBalance}`);
        throw new InsufficientCreditsException();
      }

      const newBalance = currentBalance - amount;

      // Update balance
      const updateResult = await queryRunner.query(
        `UPDATE user_credits 
         SET balance = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2`,
        [Math.floor(newBalance), user_id],
      );

      if (updateResult.affectedRows === 0 && !updateResult[1]) {
        throw new CreditDeductionFailedException('Failed to update user balance');
      }

      // Log transaction (if you have a transactions table, uncomment this)
      // await queryRunner.query(
      //   `INSERT INTO credit_transactions (user_id, amount, type, description, created_at)
      //    VALUES ($1, $2, 'debit', $3, CURRENT_TIMESTAMP)`,
      //   [user_id, amount, description || 'Credit deduction'],
      // );

      await queryRunner.commitTransaction();

      this.logger.log(`Successfully deducted ${amount} credits from user ${user_id}. New balance: ${newBalance}`);

      return plainToInstance(CreditDeductionResponseDto, {
        success: true,
        remaining_balance: newBalance,
        deducted_amount: amount,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to deduct credits for user ${user_id}:`, error);
      
      if (error instanceof InsufficientCreditsException || error instanceof UserNotFoundException) {
        throw error;
      }
      
      throw new CreditDeductionFailedException(`Credit deduction failed: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Gets current user credits balance
   */
  async getUserBalance(userId: number): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT balance FROM user_credits WHERE user_id = $1`,
      [userId],
    );

    if (!result || result.length === 0) {
      throw new UserNotFoundException();
    }

    return parseFloat(result[0].balance);
  }

  /**
   * Validates if user exists and is active
   */
  async validateUser(userId: number): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT CASE WHEN up.id IS NOT NULL THEN true ELSE false END as is_active 
       FROM user_profiles up 
       WHERE up.id = $1`,
      [userId],
    );

    return result && result.length > 0 && result[0].is_active;
  }
}