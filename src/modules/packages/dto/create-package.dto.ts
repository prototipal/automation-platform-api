import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  MaxLength,
  IsInt,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PackageType } from '@/modules/packages/enums';

export class CreatePackageDto {
  @ApiProperty({
    description: 'Package name',
    example: 'Pro Plan',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Package type',
    example: PackageType.PRO,
    enum: PackageType,
  })
  @IsEnum(PackageType)
  type: PackageType;

  @ApiPropertyOptional({
    description: 'Package description',
    example: 'Perfect for growing businesses with advanced features',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Monthly price in dollars',
    example: 29.99,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => Math.round(value * 100)) // Convert to cents for storage
  monthly_price_cents: number;

  @ApiProperty({
    description: 'Yearly price in dollars',
    example: 299.99,
    minimum: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => Math.round(value * 100)) // Convert to cents for storage
  yearly_price_cents: number;

  @ApiPropertyOptional({
    description: 'Stripe price ID for monthly subscription',
    example: 'price_1234567890',
  })
  @IsOptional()
  @IsString()
  stripe_monthly_price_id?: string;

  @ApiPropertyOptional({
    description: 'Stripe price ID for yearly subscription',
    example: 'price_0987654321',
  })
  @IsOptional()
  @IsString()
  stripe_yearly_price_id?: string;

  @ApiProperty({
    description: 'Monthly credit allowance',
    example: 1000,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  monthly_credits: number;

  @ApiPropertyOptional({
    description: 'Maximum allowed generations per month',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_generations_per_month?: number;

  @ApiPropertyOptional({
    description: 'Package features as JSON object',
    example: {
      api_access: true,
      priority_support: true,
      advanced_models: ['KLING_V2_1', 'PIKA_V2'],
      max_resolution: '4K',
      commercial_license: true,
    },
  })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @ApiProperty({
    description: 'Package priority for ordering (higher = more priority)',
    example: 3,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  priority: number;

  @ApiPropertyOptional({
    description: 'Whether this package is currently active and available',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether this is the default package for new users',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean = false;

  @ApiPropertyOptional({
    description: 'Additional metadata for package configuration',
    example: { stripe_product_id: 'prod_ABC123', external_id: 'pkg_001' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
