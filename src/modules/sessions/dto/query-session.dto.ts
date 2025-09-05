import {
  IsOptional,
  IsBoolean,
  IsString,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionType } from '../enums';

export class QuerySessionDto {
  @ApiPropertyOptional({
    description: 'Filter by session status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Search sessions by name (partial match)',
    example: 'Product',
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
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of sessions per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'created_at',
    enum: ['created_at', 'updated_at', 'name'],
  })
  @IsOptional()
  @IsString()
  sort_by?: 'created_at' | 'updated_at' | 'name' = 'created_at';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Include generation statistics for each session',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_stats?: boolean = false;

  @ApiPropertyOptional({
    description: 'Filter by session type (photo or video)',
    enum: SessionType,
    example: SessionType.PHOTO,
  })
  @IsOptional()
  @IsEnum(SessionType)
  session_type?: SessionType;
}
