import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { Package, UserPackage } from '@/modules/packages/entities';
import { PackagesRepository, UserPackagesRepository } from './packages.repository';
import { 
  CreatePackageDto, 
  UpdatePackageDto, 
  QueryPackageDto, 
  PackageResponseDto, 
  UserPackageResponseDto 
} from '@/modules/packages/dto';
import { PackageType, SubscriptionStatus, BillingInterval } from '@/modules/packages/enums';

@Injectable()
export class PackagesService {
  private readonly logger = new Logger(PackagesService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly packagesRepository: PackagesRepository,
    private readonly userPackagesRepository: UserPackagesRepository,
  ) {}

  /**
   * Create a new package
   */
  async createPackage(createPackageDto: CreatePackageDto): Promise<PackageResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if package type already exists
      const existingPackage = await this.packagesRepository.findByType(createPackageDto.type);
      if (existingPackage) {
        throw new ConflictException(`Package with type '${createPackageDto.type}' already exists`);
      }

      // If this is set as default, remove default from other packages
      if (createPackageDto.is_default) {
        await queryRunner.manager.update(Package, 
          { is_default: true }, 
          { is_default: false }
        );
      }

      const package_ = queryRunner.manager.create(Package, createPackageDto);
      const savedPackage = await queryRunner.manager.save(package_);

      await queryRunner.commitTransaction();

      this.logger.log(`Package created successfully: ${savedPackage.name} (${savedPackage.type})`);
      
      return plainToInstance(PackageResponseDto, savedPackage, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create package: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get all packages with optional filtering
   */
  async findAllPackages(query: QueryPackageDto): Promise<PackageResponseDto[]> {
    const packages = await this.packagesRepository.findAllPackages(query);
    
    return packages.map(package_ =>
      plainToInstance(PackageResponseDto, package_, {
        excludeExtraneousValues: true,
      })
    );
  }

  /**
   * Get package by ID
   */
  async findPackageById(id: number): Promise<PackageResponseDto> {
    const package_ = await this.packagesRepository.findOne({
      where: { id },
    });

    if (!package_) {
      throw new NotFoundException(`Package with ID '${id}' not found`);
    }

    return plainToInstance(PackageResponseDto, package_, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get package by type
   */
  async findPackageByType(type: PackageType): Promise<PackageResponseDto> {
    const package_ = await this.packagesRepository.findByType(type);

    if (!package_) {
      throw new NotFoundException(`Package with type '${type}' not found`);
    }

    return plainToInstance(PackageResponseDto, package_, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Update package
   */
  async updatePackage(id: number, updatePackageDto: UpdatePackageDto): Promise<PackageResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const package_ = await this.packagesRepository.findOne({ where: { id } });
      if (!package_) {
        throw new NotFoundException(`Package with ID '${id}' not found`);
      }

      // Check if type is being changed and conflicts with existing
      if (updatePackageDto.type && updatePackageDto.type !== package_.type) {
        const existingPackage = await this.packagesRepository.findByType(updatePackageDto.type);
        if (existingPackage) {
          throw new ConflictException(`Package with type '${updatePackageDto.type}' already exists`);
        }
      }

      // If this is set as default, remove default from other packages
      if (updatePackageDto.is_default) {
        await queryRunner.manager.update(Package, 
          { is_default: true }, 
          { is_default: false }
        );
      }

      await queryRunner.manager.update(Package, id, updatePackageDto);
      const updatedPackage = await queryRunner.manager.findOne(Package, { where: { id } });

      await queryRunner.commitTransaction();

      this.logger.log(`Package updated successfully: ${updatedPackage.name} (ID: ${id})`);

      return plainToInstance(PackageResponseDto, updatedPackage, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update package: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete package (soft delete by setting is_active to false)
   */
  async deletePackage(id: number): Promise<void> {
    const package_ = await this.packagesRepository.findOne({ where: { id } });
    if (!package_) {
      throw new NotFoundException(`Package with ID '${id}' not found`);
    }

    // Check if package has active subscriptions
    const activeSubscriptions = await this.userPackagesRepository.count({
      where: {
        package_id: id,
        status: SubscriptionStatus.ACTIVE,
        is_active: true,
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        `Cannot delete package with ${activeSubscriptions} active subscriptions`
      );
    }

    await this.packagesRepository.update(id, { is_active: false });
    this.logger.log(`Package soft deleted: ${package_.name} (ID: ${id})`);
  }

  /**
   * Assign package to user (create subscription)
   */
  async assignPackageToUser(
    userId: string,
    packageId: number,
    stripeSubscriptionId?: string,
    stripeCustomerId?: string,
    billingInterval?: BillingInterval,
    trialStart?: Date,
    trialEnd?: Date
  ): Promise<UserPackageResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify package exists
      const package_ = await this.packagesRepository.findOne({
        where: { id: packageId, is_active: true },
      });

      if (!package_) {
        throw new NotFoundException(`Active package with ID '${packageId}' not found`);
      }

      // Deactivate current active subscriptions for this user
      await this.userPackagesRepository.deactivateUserSubscriptions(userId);

      // Calculate billing period dates
      const now = new Date();
      let currentPeriodStart = now;
      let currentPeriodEnd: Date;

      if (billingInterval === BillingInterval.YEAR) {
        currentPeriodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      } else {
        // Default to monthly
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      }

      // Create new user package subscription
      const userPackage = queryRunner.manager.create(UserPackage, {
        user_id: userId,
        package_id: packageId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        status: SubscriptionStatus.ACTIVE,
        billing_interval: billingInterval || BillingInterval.MONTH,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_start: trialStart,
        trial_end: trialEnd,
        credits_used_current_period: 0,
        generations_current_period: 0,
        cancel_at_period_end: false,
        is_active: true,
      });

      const savedUserPackage = await queryRunner.manager.save(userPackage);
      
      // Load with package relation
      const userPackageWithPackage = await queryRunner.manager.findOne(UserPackage, {
        where: { id: savedUserPackage.id },
        relations: ['package'],
      });

      await queryRunner.commitTransaction();

      this.logger.log(
        `Package assigned to user: ${userId} -> ${package_.name} (${package_.type})`
      );

      return plainToInstance(UserPackageResponseDto, userPackageWithPackage, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to assign package to user: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get user's current active package
   */
  async getUserCurrentPackage(userId: string): Promise<UserPackageResponseDto | null> {
    const userPackage = await this.userPackagesRepository.findActiveUserPackage(userId);
    
    if (!userPackage) {
      return null;
    }

    return plainToInstance(UserPackageResponseDto, userPackage, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get user's package history
   */
  async getUserPackageHistory(userId: string): Promise<UserPackageResponseDto[]> {
    const userPackages = await this.userPackagesRepository.findUserPackageHistory(userId);
    
    return userPackages.map(userPackage =>
      plainToInstance(UserPackageResponseDto, userPackage, {
        excludeExtraneousValues: true,
      })
    );
  }

  /**
   * Assign default/free package to new user
   */
  async assignDefaultPackageToNewUser(userId: string): Promise<UserPackageResponseDto> {
    let defaultPackage = await this.packagesRepository.getDefaultPackage();
    
    if (!defaultPackage) {
      // Fallback to free package
      defaultPackage = await this.packagesRepository.getFreePackage();
    }

    if (!defaultPackage) {
      throw new NotFoundException('No default or free package found for new users');
    }

    return this.assignPackageToUser(userId, defaultPackage.id);
  }

  /**
   * Update user package usage counters
   */
  async updateUsageCounters(
    userId: string,
    creditsUsed: number,
    generationsCount: number = 1
  ): Promise<void> {
    const userPackage = await this.userPackagesRepository.findActiveUserPackage(userId);
    
    if (!userPackage) {
      this.logger.warn(`No active package found for user ${userId} to update usage`);
      return;
    }

    await this.userPackagesRepository.updateUsageCounters(
      userPackage.id,
      creditsUsed,
      generationsCount
    );

    this.logger.debug(
      `Usage updated for user ${userId}: +${creditsUsed} credits, +${generationsCount} generations`
    );
  }

  /**
   * Check if user has exceeded package limits
   */
  async checkPackageLimits(userId: string): Promise<{
    canGenerate: boolean;
    reason?: string;
    creditsRemaining: number;
    generationsRemaining: number;
  }> {
    const userPackage = await this.userPackagesRepository.findActiveUserPackage(userId);
    
    if (!userPackage) {
      return {
        canGenerate: false,
        reason: 'No active subscription found',
        creditsRemaining: 0,
        generationsRemaining: 0,
      };
    }

    const creditsRemaining = Math.max(0, 
      userPackage.package.monthly_credits - userPackage.credits_used_current_period
    );

    let generationsRemaining = Infinity;
    if (userPackage.package.max_generations_per_month) {
      generationsRemaining = Math.max(0,
        userPackage.package.max_generations_per_month - userPackage.generations_current_period
      );
    }

    const canGenerate = creditsRemaining > 0 && generationsRemaining > 0;
    let reason: string | undefined;

    if (!canGenerate) {
      if (creditsRemaining <= 0) {
        reason = 'Monthly credit limit exceeded';
      } else if (generationsRemaining <= 0) {
        reason = 'Monthly generation limit exceeded';
      }
    }

    return {
      canGenerate,
      reason,
      creditsRemaining,
      generationsRemaining: generationsRemaining === Infinity ? -1 : generationsRemaining,
    };
  }
}