import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Package } from './package.entity';
import { SubscriptionStatus, BillingInterval } from '../enums';

@Entity('user_packages')
@Index('idx_user_package_user_id', ['user_id'])
@Index('idx_user_package_status', ['status'])
@Index('idx_user_package_stripe_subscription', ['stripe_subscription_id'])
@Index('idx_user_package_active_subscription', ['user_id', 'status', 'is_active'])
export class UserPackage {
  @ApiProperty({
    description: 'Unique identifier for the user package relationship',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'ID of the user who owns this subscription',
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @ApiProperty({
    description: 'Package ID this subscription is for',
    example: 2,
  })
  @Column({ type: 'int', nullable: false })
  package_id: number;

  @ApiProperty({
    description: 'Stripe subscription ID',
    example: 'sub_1234567890',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_subscription_id?: string;

  @ApiProperty({
    description: 'Stripe customer ID',
    example: 'cus_1234567890',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  stripe_customer_id?: string;

  @ApiProperty({
    description: 'Current subscription status',
    example: SubscriptionStatus.ACTIVE,
    enum: SubscriptionStatus,
  })
  @Column({ type: 'enum', enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Billing interval for the subscription',
    example: BillingInterval.MONTH,
    enum: BillingInterval,
  })
  @Column({ type: 'enum', enum: BillingInterval, nullable: true })
  billing_interval?: BillingInterval;

  @ApiProperty({
    description: 'When the current billing period started',
    example: '2025-01-01T00:00:00.000Z',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  current_period_start?: Date;

  @ApiProperty({
    description: 'When the current billing period ends',
    example: '2025-02-01T00:00:00.000Z',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  current_period_end?: Date;

  @ApiProperty({
    description: 'Credits used in the current billing period',
    example: 250,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  credits_used_current_period: number;

  @ApiProperty({
    description: 'Generations count in the current billing period',
    example: 125,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  generations_current_period: number;

  @ApiProperty({
    description: 'Whether the subscription should cancel at period end',
    example: false,
  })
  @Column({ type: 'boolean', default: false, nullable: false })
  cancel_at_period_end: boolean;

  @ApiProperty({
    description: 'When the subscription was cancelled (if applicable)',
    example: null,
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at?: Date;

  @ApiProperty({
    description: 'When the subscription trial started (if applicable)',
    example: null,
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  trial_start?: Date;

  @ApiProperty({
    description: 'When the subscription trial ends (if applicable)',
    example: null,
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  trial_end?: Date;

  @ApiProperty({
    description: 'Whether this subscription record is active',
    example: true,
  })
  @Column({ type: 'boolean', default: true, nullable: false })
  is_active: boolean;

  @ApiProperty({
    description: 'Subscription creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({
    description: 'Subscription last update timestamp',
    example: '2025-01-15T15:45:00.000Z',
  })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @ApiProperty({
    description: 'Additional metadata for tracking subscription events and history',
    example: { 
      payment_method: 'card',
      last_payment_date: '2025-01-15T10:30:00.000Z',
      next_billing_date: '2025-02-15T10:30:00.000Z'
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Relations
  @ManyToOne(() => Package, { eager: true })
  @JoinColumn({ name: 'package_id' })
  package: Package;
}