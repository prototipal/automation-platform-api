import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryTemplateDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by category name (partial match)',
    example: 'General',
  })
  @IsOptional()
  @IsString()
  category_name?: string;

  @ApiPropertyOptional({
    description: 'Filter by template type',
    enum: ['photo', 'video'],
  })
  @IsOptional()
  @IsEnum(['photo', 'video'])
  type?: 'photo' | 'video';

  @ApiPropertyOptional({
    description: 'Search term for prompt text',
    example: 'landscape',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['created_at', 'updated_at', 'category_name'],
    default: 'created_at',
  })
  @IsOptional()
  @IsEnum(['created_at', 'updated_at', 'category_name'])
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @Transform(({ value }) => value.toUpperCase())
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
