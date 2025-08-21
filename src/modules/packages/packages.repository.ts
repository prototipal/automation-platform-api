import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Package, UserPackage } from '@/modules/packages/entities';
import { PackageType, SubscriptionStatus } from '@/modules/packages/enums';
import { QueryPackageDto } from '@/modules/packages/dto';

@Injectable()
export class PackagesRepository extends Repository<Package> {
  constructor(private dataSource: DataSource) {
    super(Package, dataSource.createEntityManager());
  }

  /**
   * Find all packages with optional filtering
   */
  async findAllPackages(query: QueryPackageDto): Promise<Package[]> {
    const queryBuilder = this.createQueryBuilder('package');

    if (query.type) {
      queryBuilder.andWhere('package.type = :type', { type: query.type });
    }

    if (query.is_active !== undefined) {
      queryBuilder.andWhere('package.is_active = :is_active', { 
        is_active: query.is_active 
      });
    }

    if (query.is_default !== undefined) {
      queryBuilder.andWhere('package.is_default = :is_default', { 
        is_default: query.is_default 
      });
    }

    return queryBuilder
      .orderBy('package.priority', 'DESC')
      .addOrderBy('package.id', 'ASC')
      .getMany();
  }

  /**
   * Find package by type
   */
  async findByType(type: PackageType): Promise<Package | null> {
    return this.findOne({
      where: { type, is_active: true },
    });
  }

  /**
   * Get the default package for new users
   */
  async getDefaultPackage(): Promise<Package | null> {
    return this.findOne({
      where: { is_default: true, is_active: true },
      order: { priority: 'DESC' },
    });
  }

  /**
   * Get the free package (fallback for new users)
   */
  async getFreePackage(): Promise<Package | null> {
    return this.findOne({
      where: { type: PackageType.FREE, is_active: true },
    });
  }
}

@Injectable()
export class UserPackagesRepository extends Repository<UserPackage> {
  constructor(private dataSource: DataSource) {
    super(UserPackage, dataSource.createEntityManager());
  }

  /**
   * Find active subscription for a user
   */
  async findActiveUserPackage(userId: string): Promise<UserPackage | null> {
    return this.findOne({
      where: {
        user_id: userId,
        status: SubscriptionStatus.ACTIVE,
        is_active: true,
      },
      relations: ['package'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find user package by Stripe subscription ID
   */
  async findByStripeSubscriptionId(stripeSubscriptionId: string): Promise<UserPackage | null> {
    return this.findOne({
      where: { stripe_subscription_id: stripeSubscriptionId },
      relations: ['package'],
    });
  }

  /**
   * Get all user's package history
   */
  async findUserPackageHistory(userId: string): Promise<UserPackage[]> {
    return this.find({
      where: { user_id: userId },
      relations: ['package'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Deactivate current active subscriptions for a user
   */
  async deactivateUserSubscriptions(userId: string): Promise<void> {
    await this.update(
      {
        user_id: userId,
        status: SubscriptionStatus.ACTIVE,
        is_active: true,
      },
      {
        is_active: false,
        status: SubscriptionStatus.CANCELLED,
        cancelled_at: new Date(),
      }
    );
  }

  /**
   * Update usage counters for current billing period
   */
  async updateUsageCounters(
    userPackageId: string,
    creditsUsed: number,
    generationsCount: number = 1
  ): Promise<void> {
    await this.createQueryBuilder()
      .update(UserPackage)
      .set({
        credits_used_current_period: () => `credits_used_current_period + ${creditsUsed}`,
        generations_current_period: () => `generations_current_period + ${generationsCount}`,
      })
      .where('id = :id', { id: userPackageId })
      .execute();
  }

  /**
   * Reset usage counters for new billing period
   */
  async resetUsageCounters(userPackageId: string): Promise<void> {
    await this.update(userPackageId, {
      credits_used_current_period: 0,
      generations_current_period: 0,
    });
  }

  /**
   * Find subscriptions that need billing period reset
   */
  async findSubscriptionsForBillingReset(): Promise<UserPackage[]> {
    return this.createQueryBuilder('userPackage')
      .leftJoinAndSelect('userPackage.package', 'package')
      .where('userPackage.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('userPackage.is_active = :isActive', { isActive: true })
      .andWhere('userPackage.current_period_end < :now', { now: new Date() })
      .getMany();
  }
}