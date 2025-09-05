import { IsString, IsUUID, IsEnum, IsOptional, IsObject, ValidateNested, IsBoolean, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationPriority } from '../interfaces';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID who should receive the notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
    example: NotificationType.VIDEO_GENERATION_COMPLETED,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Title of the notification',
    example: 'Video Generated Successfully',
    maxLength: 100,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Detailed message content',
    example: 'Your video has been generated and is ready for download.',
    maxLength: 500,
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional data specific to notification type',
    example: {
      generationId: '123e4567-e89b-12d3-a456-426614174000',
      videoUrls: ['https://example.com/video1.mp4'],
    },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    description: 'Priority level of the notification',
    example: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Whether the notification should be persisted',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  persistent?: boolean;
}

export class VideoGenerationNotificationDto {
  @ApiProperty({
    description: 'Generation ID in our database',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  generationId: string;

  @ApiProperty({
    description: 'Replicate prediction ID',
    example: 'pred_abc123def456',
  })
  @IsString()
  replicateId: string;

  @ApiProperty({
    description: 'User ID who owns the generation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Model used for generation',
    example: 'bytedance/kling-v2-1',
  })
  @IsString()
  model: string;

  @ApiProperty({
    description: 'Model version',
    example: 'kling-v2-1',
  })
  @IsString()
  modelVersion: string;

  @ApiProperty({
    description: 'Session ID associated with the generation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Video URLs (Supabase URLs)',
    type: [String],
    example: [
      'https://supabase.co/storage/v1/object/public/generations/video1.mp4',
      'https://supabase.co/storage/v1/object/public/generations/video2.mp4',
    ],
  })
  @IsOptional()
  @IsString({ each: true })
  videoUrls?: string[];

  @ApiPropertyOptional({
    description: 'Processing time in seconds',
    example: 45.67,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  processingTime?: number;

  @ApiPropertyOptional({
    description: 'Credits used for generation',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditsUsed?: number;

  @ApiPropertyOptional({
    description: 'Error message if generation failed',
    example: 'Insufficient GPU resources available',
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({
    description: 'Current status for progress tracking',
    example: 'processing',
  })
  @IsOptional()
  @IsString()
  status?: 'starting' | 'processing';

  @ApiPropertyOptional({
    description: 'Progress percentage (0-100)',
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;

  @ApiPropertyOptional({
    description: 'Estimated time remaining in seconds',
    example: 120,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedTime?: number;

  @ApiPropertyOptional({
    description: 'When processing started',
    example: '2025-01-15T10:30:05.000Z',
  })
  @IsOptional()
  @IsString()
  startedAt?: string;
}

export class NotificationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who received the notification',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    enum: NotificationType,
    description: 'Type of notification',
    example: NotificationType.VIDEO_GENERATION_COMPLETED,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Title of the notification',
    example: 'Video Generated Successfully',
  })
  title: string;

  @ApiProperty({
    description: 'Detailed message content',
    example: 'Your video has been generated and is ready for download.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Additional data specific to notification type',
    example: {
      generationId: '123e4567-e89b-12d3-a456-426614174000',
      videoUrls: ['https://example.com/video1.mp4'],
    },
  })
  data?: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when notification was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    enum: NotificationPriority,
    description: 'Priority level of the notification',
    example: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Whether the notification was persisted',
    example: true,
  })
  persistent: boolean;

  @ApiProperty({
    description: 'Whether the notification was sent successfully',
    example: true,
  })
  sent: boolean;
}