import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ 
    description: 'Template category name',
    example: 'General'
  })
  @IsString()
  @IsNotEmpty()
  category_name: string;

  @ApiPropertyOptional({ 
    description: 'Category link URL',
    example: 'https://example.com/category'
  })
  @IsOptional()
  @IsString()
  category_link?: string;

  @ApiProperty({ 
    description: 'Template image URL',
    example: 'https://example.com/image.jpg'
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  image_url: string;

  @ApiProperty({ 
    description: 'Template prompt text',
    example: 'A beautiful landscape photo...'
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({ 
    description: 'Template type',
    enum: ['photo', 'video'],
    default: 'photo'
  })
  @IsOptional()
  @IsEnum(['photo', 'video'])
  type?: 'photo' | 'video';
}