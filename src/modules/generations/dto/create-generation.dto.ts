import { IsEnum, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceModel, ModelVersion } from '@/modules/services/enums';

export class CreateGenerationDto {
  @ApiProperty({
    enum: ServiceModel,
    description: 'The model to use for video generation',
    example: ServiceModel.KWAIGI,
  })
  @IsEnum(ServiceModel)
  @IsNotEmpty()
  model: ServiceModel;

  @ApiProperty({
    enum: ModelVersion,
    description: 'The model version to use for video generation',
    example: ModelVersion.KLING_V2_1,
    required: false,
  })
  @IsEnum(ModelVersion)
  model_version: ModelVersion;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Input parameters for the video generation, validated against service configuration',
    example: {
      prompt: 'a woman takes her hands out her pockets and gestures to the words with both hands, she is excited, behind her it is raining',
      start_image: 'https://replicate.delivery/xezq/rfKExHkg7L2UAyYNJj3p1YrW1M3ZROTQQXupJSOyM5RkwQcKA/tmpowaafuyw.png',
    },
  })
  @IsObject()
  @IsNotEmpty()
  input: Record<string, any>;
}