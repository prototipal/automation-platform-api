import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Service } from '../../services/entities';
import {
  ServiceModel,
  ModelVersion,
  TextToImageModelVersion,
  TextToVideoModelVersion,
} from '../../services/enums';

@Entity('generations')
@Index('idx_generation_user_id', ['user_id'])
@Index('idx_generation_session_id', ['session_id'])
@Index('idx_generation_created_at', ['created_at'])
export class Generation {
  @ApiProperty({
    description: 'Unique identifier for the generation',
    example: 1,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'ID of the user who created this generation',
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @Column({ type: 'uuid', nullable: false })
  @Index('idx_generation_user_lookup')
  user_id: string;

  @ApiProperty({
    description: 'ID of the session this generation belongs to',
    example: 456,
  })
  @Column({ type: 'int', nullable: false })
  @Index('idx_generation_session_lookup')
  session_id: number;

  @ApiProperty({
    description: 'Replicate API prediction ID',
    example: 'abc123def456',
  })
  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index('idx_generation_replicate_id')
  replicate_id: string;

  @ApiProperty({
    description: 'Service model used for generation',
    example: 'KWAIGI',
  })
  @Column({ type: 'enum', enum: ServiceModel, nullable: false })
  model: ServiceModel;

  @ApiProperty({
    description: 'Model version used for generation',
    example: 'KLING_V2_1',
  })
  @Column({
    type: 'enum',
    enum: [
      ...Object.values(TextToImageModelVersion),
      ...Object.values(TextToVideoModelVersion),
    ],
    nullable: false,
  })
  model_version: ModelVersion;

  @ApiProperty({
    description: 'Input parameters used for generation',
    example: { prompt: 'A beautiful sunset', aspect_ratio: '16:9' },
  })
  @Column({ type: 'jsonb', nullable: false })
  input_parameters: Record<string, any>;

  @ApiProperty({
    description: 'Generation output URLs or data',
    example: { output: ['https://example.com/image.jpg'] },
  })
  @Column({ type: 'jsonb', nullable: true })
  output_data?: Record<string, any>;

  @ApiProperty({
    description: 'Generation status',
    example: 'completed',
    enum: ['pending', 'starting', 'processing', 'completed', 'failed'],
  })
  @Column({
    type: 'enum',
    enum: ['pending', 'starting', 'processing', 'completed', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'starting' | 'processing' | 'completed' | 'failed';

  @ApiProperty({
    description: 'Credits used for this generation',
    example: 2.5,
  })
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  credits_used: number;

  @ApiProperty({
    description: 'Error message if generation failed',
    example: null,
  })
  @Column({ type: 'text', nullable: true })
  error_message?: string;

  @ApiProperty({
    description: 'Supabase file URLs for generated content',
    example: [
      'https://supabase.com/storage/v1/object/public/generations/abc123.jpg',
    ],
  })
  @Column({ type: 'jsonb', nullable: true })
  supabase_urls?: string[];

  @ApiProperty({
    description: 'Generation creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty({
    description: 'Generation last update timestamp',
    example: '2025-01-15T15:45:00.000Z',
  })
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @ApiProperty({
    description: 'Processing time in seconds',
    example: 45.2,
  })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  processing_time_seconds?: number;

  @ApiProperty({
    description: 'Metadata for tracking and analytics',
    example: { ip_address: '192.168.1.1', user_agent: 'Mozilla/5.0...' },
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Indicates if the generation is active (not soft deleted)',
    example: true,
    default: true,
  })
  @Column({ type: 'boolean', default: true, nullable: false })
  @Index('idx_generations_is_active')
  is_active: boolean;
}
