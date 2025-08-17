import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, ServiceModel, TextToImageModelVersion, TextToVideoModelVersion } from '../enums';
import type { ModelVersion } from '../enums';
import type { ServiceFields } from '../entities';

export class CreateServiceDto {
  @ApiPropertyOptional({
    description: 'Service provider',
    default: 'replicate',
    example: 'replicate',
  })
  @IsOptional()
  @IsString()
  from?: string = 'replicate';

  @ApiProperty({
    description: 'Type of service',
    enum: ServiceType,
    example: ServiceType.IMAGE_TO_VIDEO,
  })
  @IsEnum(ServiceType)
  @IsNotEmpty()
  type: ServiceType;

  @ApiProperty({
    description: 'AI model provider',
    enum: ServiceModel,
    example: ServiceModel.GOOGLE,
  })
  @IsEnum(ServiceModel)
  @IsNotEmpty()
  model: ServiceModel;

  @ApiPropertyOptional({
    description: 'Specific model version',
    enum: [...Object.values(TextToImageModelVersion), ...Object.values(TextToVideoModelVersion)],
    example: TextToVideoModelVersion.VEO_3,
  })
  @IsOptional()
  @IsEnum([...Object.values(TextToImageModelVersion), ...Object.values(TextToVideoModelVersion)])
  model_version?: ModelVersion;

  @ApiPropertyOptional({
    description: 'Human-readable display name for the service',
    example: 'Google Veo 3 Video Generator',
  })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({
    description: 'Logo URL or logo data for the service',
    example: 'https://example.com/logo.png',
  })
  @IsOptional()
  @IsString()
  logo?: string;

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
      duration: {
        required: false,
        type: 'enum',
        values: ['5', '10'],
        desc: 'Video duration in seconds',
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  fields: ServiceFields;

  @ApiPropertyOptional({
    description: 'Whether the service is active and available for use',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;
}
