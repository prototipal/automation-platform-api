import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PackageType, BillingInterval } from '../enums';

@Entity('packages')
@Index('idx_package_type', ['type'])
@Index('idx_package_is_active', ['is_active'])
export class Package {
  @ApiProperty({
    description: 'Unique identifier for the package',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Package name',
    example: 'Pro Plan',
  })
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @ApiProperty({
    description: 'Package type',
    example: PackageType.PRO,
    enum: PackageType,
  })
  @Column({ type: 'enum', enum: PackageType, nullable: false, unique: true })
  type: PackageType;

  @ApiProperty({
    description: 'Package description',
    example: 'Perfect for growing businesses',
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({
    description: 'Monthly price in cents (USD)',
    example: 2999, // $29.99
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  monthly_price_cents: number;

  @ApiProperty({
    description: 'Yearly price in cents (USD)',
    example: 29999, // $299.99
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  yearly_price_cents: number;

  @ApiProperty({
    description: 'Stripe price ID for monthly subscription',
    example: 'price_1234567890',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_monthly_price_id?: string;

  @ApiProperty({
    description: 'Stripe price ID for yearly subscription',
    example: 'price_0987654321',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_yearly_price_id?: string;

  @ApiProperty({
    description: 'Monthly credit allowance',
    example: 1000,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  monthly_credits: number;

  @ApiProperty({
    description: 'Maximum allowed generations per month',
    example: 500,
  })
  @Column({ type: 'int', nullable: true })
  max_generations_per_month?: number;

  @ApiProperty({
    description: 'Package features as JSON object',
    example: {
      api_access: true,
      priority_support: true,
      advanced_models: ['KLING_V2_1', 'PIKA_V2'],
      max_resolution: '4K',
      commercial_license: true,
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  features?: Record<string, any>;

  @ApiProperty({
    description: 'Package priority for ordering (higher = more priority)',
    example: 3,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  priority: number;

  @ApiProperty({
    description: 'Whether this package is currently active and available',
    example: true,
  })
  @Column({ type: 'boolean', default: true, nullable: false })
  is_active: boolean;

  @ApiProperty({
    description: 'Whether this is the default package for new users',
    example: false,
  })
  @Column({ type: 'boolean', default: false, nullable: false })
  is_default: boolean;

  @ApiProperty({
    description: 'Package creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({
    description: 'Package last update timestamp',
    example: '2025-01-15T15:45:00.000Z',
  })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @ApiProperty({
    description: 'Additional metadata for package configuration',
    example: { stripe_product_id: 'prod_ABC123', external_id: 'pkg_001' },
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
