import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GenerationResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the generation request',
    example: 'pred_c28lcme55c7629mcj7g6vkjzvw',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Current status of the generation',
    example: 'starting',
    enum: ['starting', 'processing', 'succeeded', 'failed', 'canceled'],
  })
  @Expose()
  status: string;

  @ApiProperty({
    description: 'Input parameters used for the generation',
    type: 'object',
    additionalProperties: true,
  })
  @Expose()
  input: Record<string, any>;

  @ApiProperty({
    description: 'Generation output (available when status is succeeded)',
    type: 'object',
    additionalProperties: true,
  })
  @Expose()
  output?: Record<string, any>;

  @ApiProperty({
    description: 'Error details (available when status is failed)',
    type: 'string',
  })
  @Expose()
  error?: string;

  @ApiProperty({
    description: 'URLs for retrieving logs',
    type: 'object',
    additionalProperties: true,
  })
  @Expose()
  logs?: Record<string, any>;

  @ApiProperty({
    description: 'Completion percentage (0-100)',
    type: 'number',
  })
  @Expose()
  completed_at?: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-08-05T10:30:00.000Z',
  })
  @Expose()
  created_at: string;

  @ApiProperty({
    description: 'Start timestamp',
    example: '2024-08-05T10:30:05.000Z',
  })
  @Expose()
  started_at?: string;

  @ApiProperty({
    description: 'Model used for generation',
    example: 'kwaivgi/kling-v2.1',
  })
  @Expose()
  model: string;

  @ApiProperty({
    description: 'Version identifier',
    example: 'v1.0',
  })
  @Expose()
  version?: string;

  @ApiProperty({
    description: 'Generation metrics and metadata',
    type: 'object',
    additionalProperties: true,
  })
  @Expose()
  metrics?: Record<string, any>;

  @ApiProperty({
    description: 'URLs for the generation request',
    type: 'object',
    additionalProperties: true,
  })
  @Expose()
  urls?: Record<string, any>;
}