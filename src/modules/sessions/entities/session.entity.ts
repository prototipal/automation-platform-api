import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('sessions')
@Index('idx_session_user_id', ['user_id'])
@Index('idx_session_created_at', ['created_at'])
export class Session {
  @ApiProperty({
    description: 'Unique identifier for the session',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'ID of the user who owns this session',
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @Column({ type: 'uuid', nullable: false })
  @Index('idx_session_user_id_lookup')
  user_id: string;

  @ApiProperty({
    description: 'Name or title of the session',
    example: 'Product Photo Shoot Session',
  })
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @ApiProperty({
    description: 'Optional description of the session',
    example: 'Session for generating product images for e-commerce',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({
    description: 'Session last update timestamp',
    example: '2025-01-15T15:45:00.000Z',
  })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @ApiProperty({
    description: 'Whether the session is active',
    example: true,
  })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Virtual properties for API responses
  @ApiProperty({
    description: 'Count of generations in this session',
    example: 5,
  })
  generation_count?: number;

  @ApiProperty({
    description: 'Total credits spent in this session',
    example: 12.5,
  })
  total_credits_spent?: number;
}
