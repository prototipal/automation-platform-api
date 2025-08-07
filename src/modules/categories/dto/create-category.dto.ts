import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ 
    description: 'Category name (must be unique)',
    example: 'General'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ 
    description: 'Category link URL',
    example: 'https://example.com/category'
  })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ 
    description: 'Category type',
    enum: ['photo', 'video'],
    default: 'photo'
  })
  @IsOptional()
  @IsEnum(['photo', 'video'])
  type?: 'photo' | 'video';
}