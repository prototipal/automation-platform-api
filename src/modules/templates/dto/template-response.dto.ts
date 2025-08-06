import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class TemplateResponseDto {
  @ApiProperty({
    description: 'Template unique identifier',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  })
  @Expose()
  id: string;

  @ApiProperty({ 
    description: 'Template category name',
    example: 'General'
  })
  @Expose()
  category_name: string;

  @ApiPropertyOptional({ 
    description: 'Category link URL',
    example: 'https://example.com/category'
  })
  @Expose()
  category_link: string;

  @ApiProperty({ 
    description: 'Template image URL',
    example: 'https://example.com/image.jpg'
  })
  @Expose()
  image_url: string;

  @ApiProperty({ 
    description: 'Template prompt text',
    example: 'A beautiful landscape photo...'
  })
  @Expose()
  prompt: string;

  @ApiProperty({ 
    description: 'Template type',
    enum: ['photo', 'video'],
    example: 'photo'
  })
  @Expose()
  type: 'photo' | 'video';

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-12-01T10:00:00Z'
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-12-01T10:00:00Z'
  })
  @Expose()
  updated_at: Date;
}