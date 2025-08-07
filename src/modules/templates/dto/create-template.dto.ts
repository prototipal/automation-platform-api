import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ 
    description: 'Category ID that this template belongs to',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  category_id: string;

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