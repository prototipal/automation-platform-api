import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCategoryDto {
  @ApiPropertyOptional({
    description: 'Filter by category name (partial match)',
    example: 'General'
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by category type',
    enum: ['photo', 'video']
  })
  @IsOptional()
  @IsEnum(['photo', 'video'])
  type?: 'photo' | 'video';

  @ApiPropertyOptional({
    description: 'Page number for pagination. If not provided, all results are returned without pagination',
    minimum: 1,
    example: 1
  })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page. If not provided with page, all results are returned',
    default: 10,
    minimum: 1,
    example: 10
  })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['name', 'type', 'created_at', 'updated_at'],
    default: 'created_at'
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC'
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sort_order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Include template count in response',
    default: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  include_template_count?: boolean = false;

  @ApiPropertyOptional({
    description: 'Filter by main category ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  main_category_id?: string;
}