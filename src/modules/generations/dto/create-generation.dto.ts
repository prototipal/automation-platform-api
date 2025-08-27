import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  ServiceModel,
  TextToImageModelVersion,
  TextToVideoModelVersion,
} from '@/modules/services/enums';
import type { ModelVersion } from '@/modules/services/enums';

export class CreateGenerationDto {
  @ApiProperty({
    type: 'number',
    description: 'Session ID that this generation belongs to',
    example: 123,
  })
  @IsNumber()
  @IsNotEmpty()
  session_id: number;

  @ApiProperty({
    enum: ServiceModel,
    description: 'The model to use for generation (video or image)',
    example: ServiceModel.KWAIGI,
  })
  @IsEnum(ServiceModel)
  @IsNotEmpty()
  model: ServiceModel;

  @ApiProperty({
    enum: [
      ...Object.values(TextToImageModelVersion),
      ...Object.values(TextToVideoModelVersion),
    ],
    description: 'The model version to use for generation (video or image)',
    example: TextToVideoModelVersion.KLING_V2_1,
    required: false,
  })
  @IsEnum(
    [
      ...Object.values(TextToImageModelVersion),
      ...Object.values(TextToVideoModelVersion),
    ],
    {
      message: `model_version must be one of the following values: ${[...Object.values(TextToImageModelVersion), ...Object.values(TextToVideoModelVersion)].join(', ')}`,
    },
  )
  model_version: ModelVersion;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      'Input parameters for the generation, validated against service configuration',
    examples: {
      'Text-to-Image': {
        summary: 'Generate an image from text',
        value: {
          prompt: 'A beautiful sunset over mountains, photorealistic style',
          aspect_ratio: '16:9',
        },
      },
      'Text-to-Video': {
        summary: 'Generate a video from text and image',
        value: {
          prompt:
            'a woman takes her hands out her pockets and gestures to the words with both hands, she is excited, behind her it is raining',
          start_image: 'https://replicate.delivery/example.png',
        },
      },
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
