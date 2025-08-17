import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ServiceType,
  ServiceModel,
  TextToImageModelVersion,
  TextToVideoModelVersion,
} from '../enums';
import type { ModelVersion } from '../enums';

export class QueryServiceDto {
  @ApiPropertyOptional({
    description: 'Filter by service type',
    enum: ServiceType,
    example: ServiceType.IMAGE_TO_VIDEO,
  })
  @IsOptional()
  @IsEnum(ServiceType)
  type?: ServiceType;

  @ApiPropertyOptional({
    description: 'Filter by AI model provider',
    enum: ServiceModel,
    example: ServiceModel.GOOGLE,
  })
  @IsOptional()
  @IsEnum(ServiceModel)
  model?: ServiceModel;

  @ApiPropertyOptional({
    description: 'Filter by specific model version',
    enum: [
      ...Object.values(TextToImageModelVersion),
      ...Object.values(TextToVideoModelVersion),
    ],
    example: TextToVideoModelVersion.VEO_3,
  })
  @IsOptional()
  @IsEnum([
    ...Object.values(TextToImageModelVersion),
    ...Object.values(TextToVideoModelVersion),
  ])
  model_version?: ModelVersion;

  @ApiPropertyOptional({
    description: 'Filter by service provider',
    example: 'replicate',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
}
