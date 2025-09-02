import { IsString, IsOptional, IsEnum, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ReplicateWebhookStatus {
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export class ReplicateWebhookUrlsDto {
  @ApiProperty({
    description: 'URL to get the prediction details',
    example: 'https://api.replicate.com/v1/predictions/abc123',
  })
  @IsString()
  @IsOptional()
  get?: string;

  @ApiProperty({
    description: 'URL to cancel the prediction',
    example: 'https://api.replicate.com/v1/predictions/abc123/cancel',
  })
  @IsString()
  @IsOptional()
  cancel?: string;

  @ApiProperty({
    description: 'URL to stream the prediction results',
    example: 'https://api.replicate.com/v1/predictions/abc123/stream',
  })
  @IsString()
  @IsOptional()
  stream?: string;
}

export class ReplicateWebhookDto {
  @ApiProperty({
    description: 'Unique identifier for the prediction',
    example: 'abc123def456',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Model used for the prediction',
    example: 'bytedance/seedance-1-pro',
  })
  @IsString()
  model: string;

  @ApiProperty({
    description: 'Version of the model',
    example: 'latest',
  })
  @IsString()
  version: string;

  @ApiProperty({
    description: 'Input parameters used for the prediction',
    example: { prompt: 'A beautiful sunset', duration: 5 },
  })
  @IsObject()
  input: Record<string, any>;

  @ApiProperty({
    description: 'Output from the prediction (URLs or data)',
    example: ['https://replicate.delivery/video.mp4'],
    required: false,
  })
  @IsOptional()
  output?: any;

  @ApiProperty({
    description: 'Data type of the output',
    example: 'array',
    required: false,
  })
  @IsString()
  @IsOptional()
  data_type?: string;

  @ApiProperty({
    description: 'Current status of the prediction',
    enum: ReplicateWebhookStatus,
    example: ReplicateWebhookStatus.SUCCEEDED,
  })
  @IsEnum(ReplicateWebhookStatus)
  status: ReplicateWebhookStatus;

  @ApiProperty({
    description: 'Error message if prediction failed',
    example: null,
    required: false,
  })
  @IsString()
  @IsOptional()
  error?: string;

  @ApiProperty({
    description: 'Logs from the prediction process',
    example: 'Starting prediction...\nProcessing complete.',
    required: false,
  })
  @IsString()
  @IsOptional()
  logs?: string;

  @ApiProperty({
    description: 'Prediction creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @IsString()
  created_at: string;

  @ApiProperty({
    description: 'Prediction start timestamp',
    example: '2025-01-15T10:30:05.000Z',
    required: false,
  })
  @IsString()
  @IsOptional()
  started_at?: string;

  @ApiProperty({
    description: 'Prediction completion timestamp',
    example: '2025-01-15T10:31:30.000Z',
    required: false,
  })
  @IsString()
  @IsOptional()
  completed_at?: string;

  @ApiProperty({
    description: 'Processing metrics',
    example: { predict_time: 23.45 },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metrics?: Record<string, any>;

  @ApiProperty({
    description: 'API URLs for the prediction',
    type: ReplicateWebhookUrlsDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => ReplicateWebhookUrlsDto)
  @IsOptional()
  urls?: ReplicateWebhookUrlsDto;

  @ApiProperty({
    description: 'Custom metadata passed during prediction creation',
    example: { user_id: 'user123', session_id: '456' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}