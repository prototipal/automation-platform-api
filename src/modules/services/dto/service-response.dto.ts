import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ServiceType, ServiceModel, TextToImageModelVersion, TextToVideoModelVersion, ModelVersion } from '../enums';
import type { ServiceFields } from '../entities';
import type { ServicePricing } from '../entities/service.entity';

export class ServiceResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the service',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Service provider',
    example: 'replicate',
  })
  @Expose()
  from: string;

  @ApiProperty({
    description: 'Type of service',
    enum: ServiceType,
    example: ServiceType.IMAGE_TO_VIDEO,
  })
  @Expose()
  type: ServiceType;

  @ApiProperty({
    description: 'AI model provider',
    enum: ServiceModel,
    example: ServiceModel.GOOGLE,
  })
  @Expose()
  model: ServiceModel;

  @ApiPropertyOptional({
    description: 'Specific model version',
    enum: [...Object.values(TextToImageModelVersion), ...Object.values(TextToVideoModelVersion)],
    example: TextToVideoModelVersion.VEO_3,
  })
  @Expose()
  model_version: ModelVersion | null;

  @ApiPropertyOptional({
    description: 'Human-readable display name for the service',
    example: 'Google Veo 3 Video Generator',
  })
  @Expose()
  display_name: string | null;

  @ApiPropertyOptional({
    description: 'Logo URL or logo data for the service',
    example: 'https://example.com/logo.png',
  })
  @Expose()
  logo: string | null;

  @ApiProperty({
    description: 'Field specifications for the model',
    type: 'object',
    additionalProperties: true,
    example: {
      prompt: {
        required: true,
        type: 'string',
        desc: 'Text description for video generation',
      },
    },
  })
  @Expose()
  fields: ServiceFields;

  @ApiProperty({
    description: 'Pricing configuration for the service',
    type: 'object',
    additionalProperties: true,
    example: {
      rule: {
        type: 'fixed',
        price: 0.08,
      },
    },
  })
  @Expose()
  pricing: ServicePricing;

  @ApiProperty({
    description: 'Whether the service is active and available for use',
    example: true,
  })
  @Expose()
  is_active: boolean;

  @ApiProperty({
    description: 'Date when the service was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Date when the service was last updated',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  updated_at: Date;
}
