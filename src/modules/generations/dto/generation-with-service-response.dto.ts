import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ServiceInfoDto {
  @ApiProperty({
    description: 'Service model name',
    example: 'KWAIGI',
  })
  @Expose()
  model: string;

  @ApiProperty({
    description: 'Service model version',
    example: 'KLING_V2_1',
  })
  @Expose()
  model_version: string;

  @ApiProperty({
    description: 'Display name for the service',
    example: 'Kling V2.1 by Kwaigi',
  })
  @Expose()
  display_name: string;

  @ApiProperty({
    description: 'Service logo URL',
    example: 'https://example.com/logos/kwaigi.png',
  })
  @Expose()
  logo?: string;

  @ApiProperty({
    description: 'Service type (image or video)',
    example: 'video',
  })
  @Expose()
  type: string;
}

export class GenerationWithServiceResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the generation',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'ID of the user who created this generation',
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @Expose()
  user_id: string;

  @ApiProperty({
    description: 'ID of the session this generation belongs to',
    example: 456,
  })
  @Expose()
  session_id: number;

  @ApiProperty({
    description: 'Replicate API prediction ID',
    example: 'abc123def456',
  })
  @Expose()
  replicate_id: string;

  @ApiProperty({
    description: 'Service model used for generation',
    example: 'KWAIGI',
  })
  @Expose()
  model: string;

  @ApiProperty({
    description: 'Model version used for generation',
    example: 'KLING_V2_1',
  })
  @Expose()
  model_version: string;

  @ApiProperty({
    description: 'Input parameters used for generation',
    example: { prompt: 'A beautiful sunset', aspect_ratio: '16:9' },
  })
  @Expose()
  input_parameters: Record<string, any>;

  @ApiProperty({
    description: 'Generation output URLs or data',
    example: { output: ['https://example.com/image.jpg'] },
  })
  @Expose()
  output_data?: Record<string, any>;

  @ApiProperty({
    description: 'Generation status',
    example: 'completed',
    enum: ['pending', 'starting', 'processing', 'completed', 'failed'],
  })
  @Expose()
  status: 'pending' | 'starting' | 'processing' | 'completed' | 'failed';

  @ApiProperty({
    description: 'Credits used for this generation',
    example: 2.5,
  })
  @Expose()
  credits_used: number;

  @ApiProperty({
    description: 'Error message if generation failed',
    example: null,
  })
  @Expose()
  error_message?: string;

  @ApiProperty({
    description: 'Supabase file URLs for generated content',
    example: [
      'https://supabase.com/storage/v1/object/public/generations/abc123.jpg',
    ],
  })
  @Expose()
  supabase_urls?: string[];

  @ApiProperty({
    description: 'Generation creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Generation last update timestamp',
    example: '2025-01-15T15:45:00.000Z',
  })
  @Expose()
  updated_at: Date;

  @ApiProperty({
    description: 'Processing time in seconds',
    example: 45.2,
  })
  @Expose()
  processing_time_seconds?: number;

  @ApiProperty({
    description: 'Metadata for tracking and analytics',
    example: { ip_address: '192.168.1.1', user_agent: 'Mozilla/5.0...' },
  })
  @Expose()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Service information including model name and logo',
    type: ServiceInfoDto,
  })
  @Expose()
  @Type(() => ServiceInfoDto)
  service_info?: ServiceInfoDto;
}
