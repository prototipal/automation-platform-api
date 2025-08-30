import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { CreditManagementService } from '@/modules/credits/services';

@Injectable()
export class UserInitializationService {
  private readonly logger = new Logger(UserInitializationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly creditManagementService: CreditManagementService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initialize a new user with free package and credits
   */
  async initializeNewUser(
    userId: string,
    email: string,
    fullName?: string,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Initializing new user: ${userId} (${email})`);

      // 1. Create user_profiles record
      await queryRunner.query(
        `INSERT INTO user_profiles (id, email, full_name, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [userId, email, fullName || null],
      );

      // 2. Get free package
      const freePackageResult = await queryRunner.query(
        `SELECT id, monthly_credits FROM packages WHERE type = 'free' AND is_active = true LIMIT 1`,
      );

      if (!freePackageResult || freePackageResult.length === 0) {
        throw new Error('Free package not found');
      }

      const freePackage = freePackageResult[0];
      const freeCredits = freePackage.monthly_credits || 5;

      // 3. Create user_credits record with free credits
      await this.creditManagementService.createUserCredits(
        userId,
        freeCredits, // playground credits
        0, // api credits
      );

      // 4. Assign free package to user
      const now = new Date();
      const oneYearLater = new Date(now);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1); // Free package is valid for 1 year

      await queryRunner.query(
        `INSERT INTO user_packages (
          id, user_id, package_id, status, billing_interval, 
          current_period_start, current_period_end, 
          credits_used_current_period, generations_current_period,
          cancel_at_period_end, is_active, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, 'active', 'month',
          $3, $4,
          0, 0,
          false, true, NOW(), NOW()
        )`,
        [userId, freePackage.id, now, oneYearLater],
      );

      await queryRunner.commitTransaction();

      // Emit event for other services to react
      this.eventEmitter.emit('user.initialized', {
        userId,
        email,
        fullName,
        packageId: freePackage.id,
        packageName: 'Free Plan',
        monthlyCredits: freeCredits,
        playgroundCredits: freeCredits,
        apiCredits: 0,
      });

      this.logger.log(
        `User initialized successfully: ${userId} with ${freeCredits} playground credits`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to initialize user ${userId}:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if user needs initialization (doesn't have user_credits record)
   */
  async needsInitialization(userId: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT 1 FROM user_credits WHERE user_id = $1 LIMIT 1`,
      [userId],
    );

    return !result || result.length === 0;
  }

  /**
   * Initialize user if needed
   */
  async initializeUserIfNeeded(
    userId: string,
    email: string,
    fullName?: string,
  ): Promise<boolean> {
    const needsInit = await this.needsInitialization(userId);
    
    if (needsInit) {
      await this.initializeNewUser(userId, email, fullName);
      return true;
    }
    
    return false;
  }
}