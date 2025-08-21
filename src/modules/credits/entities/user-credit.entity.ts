import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('user_credits')
@Index('idx_user_credits_user_id', ['user_id'])
@Index('idx_user_credits_user_id_active', ['user_id', 'is_active'])
export class UserCredit {
  @ApiProperty({
    description: 'Unique identifier for the user credit record',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'ID of the user who owns these credits',
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @ApiProperty({
    description: 'Playground credits for frontend usage (resets with subscription cycle)',
    example: 500,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  playground_credits: number;

  @ApiProperty({
    description: 'API credits for API usage (persistent across subscription cycles)',
    example: 1000,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  api_credits: number;

  @ApiProperty({
    description: 'Total playground credits used in current subscription period',
    example: 50,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  playground_credits_used_current_period: number;

  @ApiProperty({
    description: 'Total API credits used (lifetime)',
    example: 200,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  api_credits_used_total: number;

  @ApiProperty({
    description: 'Last time playground credits were reset',
    example: '2025-01-01T00:00:00.000Z',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  playground_credits_last_reset?: Date;

  @ApiProperty({
    description: 'When playground credits will next reset (based on subscription cycle)',
    example: '2025-02-01T00:00:00.000Z',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  playground_credits_next_reset?: Date;

  @ApiProperty({
    description: 'Legacy balance field for backward compatibility',
    example: 500,
    deprecated: true,
  })
  @Column({ type: 'int', nullable: false, default: 0 })
  balance: number;

  @ApiProperty({
    description: 'Whether this credit record is active',
    example: true,
  })
  @Column({ type: 'boolean', default: true, nullable: false })
  is_active: boolean;

  @ApiProperty({
    description: 'Credit record creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({
    description: 'Credit record last update timestamp',
    example: '2025-01-15T15:45:00.000Z',
  })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @ApiProperty({
    description: 'Additional metadata for credit tracking and audit',
    example: {
      last_playground_refill: '2025-01-01T00:00:00.000Z',
      last_api_purchase: '2025-01-10T10:30:00.000Z',
      subscription_package_id: 2,
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Computed properties for backward compatibility
  @ApiProperty({
    description: 'Total available playground credits (playground_credits - playground_credits_used_current_period)',
    example: 450,
  })
  get available_playground_credits(): number {
    return Math.max(0, this.playground_credits - this.playground_credits_used_current_period);
  }

  @ApiProperty({
    description: 'Total available API credits',
    example: 800,
  })
  get available_api_credits(): number {
    return this.api_credits;
  }

  @ApiProperty({
    description: 'Total available credits (playground + API)',
    example: 1250,
  })
  get total_available_credits(): number {
    return this.available_playground_credits + this.available_api_credits;
  }
}