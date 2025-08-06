import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
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
}
