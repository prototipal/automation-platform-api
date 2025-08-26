import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { PackageType, BillingInterval } from '@/modules/packages/enums';

export class PackageResponseDto {
  @ApiProperty({
    description: 'Package ID',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'Package name',
    example: 'Pro Plan',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Package type',
    example: PackageType.PRO,
    enum: PackageType,
  })
  @Expose()
  type: PackageType;

  @ApiPropertyOptional({
    description: 'Package description',
    example: 'Perfect for growing businesses',
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'Monthly price in dollars',
    example: 29.99,
  })
  @Expose()
  @Transform(({ obj }) => obj.monthly_price_cents / 100)
  monthly_price: number;

  @ApiProperty({
    description: 'Yearly price in dollars',
    example: 299.99,
  })
  @Expose()
  @Transform(({ obj }) => obj.yearly_price_cents / 100)
  yearly_price: number;

  @ApiPropertyOptional({
    description: 'Stripe monthly price ID',
    example: 'price_1234567890',
  })
  @Expose()
  stripe_monthly_price_id?: string;

  @ApiPropertyOptional({
    description: 'Stripe yearly price ID',
    example: 'price_0987654321',
  })
  @Expose()
  stripe_yearly_price_id?: string;

  @ApiProperty({
    description: 'Monthly credit allowance',
    example: 1000,
  })
  @Expose()
  monthly_credits: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed generations per month',
    example: 500,
  })
  @Expose()
  max_generations_per_month?: number;

  @ApiPropertyOptional({
    description: 'Package features',
    example: {
      api_access: true,
      priority_support: true,
      advanced_models: ['KLING_V2_1', 'PIKA_V2'],
      max_resolution: '4K',
      commercial_license: true,
    },
  })
  @Expose()
  features?: Record<string, any>;

  @ApiProperty({
    description: 'Package priority for ordering',
    example: 3,
  })
  @Expose()
  priority: number;

  @ApiProperty({
    description: 'Whether this package is currently active and available',
    example: true,
  })
  @Expose()
  is_active: boolean;

  @ApiProperty({
    description: 'Whether this is the default package for new users',
    example: false,
  })
  @Expose()
  is_default: boolean;
}

export class UserPackageResponseDto {
  @ApiProperty({
    description: 'User package subscription ID',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'User ID',
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @Expose()
  user_id: string;

  @ApiPropertyOptional({
    description: 'Stripe subscription ID',
    example: 'sub_1234567890',
  })
  @Expose()
  stripe_subscription_id?: string;

  @ApiPropertyOptional({
    description: 'Stripe customer ID',
    example: 'cus_1234567890',
  })
  @Expose()
  stripe_customer_id?: string;

  @ApiProperty({
    description: 'Current subscription status',
    example: 'active',
  })
  @Expose()
  status: string;

  @ApiPropertyOptional({
    description: 'Billing interval',
    example: BillingInterval.MONTH,
    enum: BillingInterval,
  })
  @Expose()
  billing_interval?: BillingInterval;

  @ApiPropertyOptional({
    description: 'Current billing period start',
    example: '2025-01-01T00:00:00.000Z',
  })
  @Expose()
  current_period_start?: Date;

  @ApiPropertyOptional({
    description: 'Current billing period end',
    example: '2025-02-01T00:00:00.000Z',
  })
  @Expose()
  current_period_end?: Date;

  @ApiProperty({
    description: 'Credits used in current period',
    example: 250,
  })
  @Expose()
  credits_used_current_period: number;

  @ApiProperty({
    description: 'Generations count in current period',
    example: 125,
  })
  @Expose()
  generations_current_period: number;

  @ApiProperty({
    description: 'Whether subscription cancels at period end',
    example: false,
  })
  @Expose()
  cancel_at_period_end: boolean;

  @ApiPropertyOptional({
    description: 'Trial start date',
    example: null,
  })
  @Expose()
  trial_start?: Date;

  @ApiPropertyOptional({
    description: 'Trial end date',
    example: null,
  })
  @Expose()
  trial_end?: Date;

  @ApiProperty({
    description: 'Package details',
    type: PackageResponseDto,
  })
  @Expose()
  @Type(() => PackageResponseDto)
  package: PackageResponseDto;

  @ApiProperty({
    description: 'Subscription creation date',
    example: '2025-01-15T10:30:00.000Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2025-01-15T15:45:00.000Z',
  })
  @Expose()
  updated_at: Date;
}