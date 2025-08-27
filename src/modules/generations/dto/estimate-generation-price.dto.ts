import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import {
  ServiceModel,
  TextToImageModelVersion,
  TextToVideoModelVersion,
} from '@/modules/services/enums';
import type { ModelVersion } from '@/modules/services/enums';

/**
 * DTO for estimating generation price without making actual generation
 */
export class EstimateGenerationPriceDto {
  @ApiProperty({
    description: 'AI model to use for generation',
    enum: ServiceModel,
    example: ServiceModel.KWAIGI,
  })
  @IsEnum(ServiceModel, {
    message: `model must be one of the following values: ${Object.values(ServiceModel).join(', ')}`,
  })
  @IsNotEmpty()
  model: ServiceModel;

  @ApiProperty({
    description: 'Specific version of the AI model',
    enum: { ...TextToImageModelVersion, ...TextToVideoModelVersion },
    example: 'flux-kontext-max',
  })
  @IsEnum(
    { ...TextToImageModelVersion, ...TextToVideoModelVersion },
    {
      message: 'model_version must be a valid ModelVersion enum value',
    },
  )
  @IsNotEmpty()
  model_version: ModelVersion;

  @ApiProperty({
    description:
      'Input parameters for the AI model (structure varies by model)',
    type: 'object',
    additionalProperties: true,
    example: {
      prompt: 'A beautiful sunset over mountains',
      aspect_ratio: '16:9',
    },
  })
  @IsObject()
  @IsNotEmpty()
  input: Record<string, any>;

  @ApiProperty({
    type: 'number',
    description:
      'Number of images to generate (only for text-to-image models). Default is 2.',
    example: 2,
    required: false,
    minimum: 1,
    maximum: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  image_count?: number = 2;
}
