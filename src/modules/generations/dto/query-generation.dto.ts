import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryGenerationDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by generation status',
    enum: ['pending', 'processing', 'completed', 'failed'],
    example: 'completed',
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'processing', 'completed', 'failed'])
  status?: 'pending' | 'processing' | 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'Search in generation prompts',
    example: 'beautiful sunset',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'created_at',
    enum: ['created_at', 'updated_at', 'status', 'credits_used'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['created_at', 'updated_at', 'status', 'credits_used'])
  sort_by: string = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sort_order: string = 'DESC';
}
