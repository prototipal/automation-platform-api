import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category unique identifier',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'General',
  })
  @Expose()
  name: string;

  @ApiPropertyOptional({
    description: 'Category link URL',
    example: 'https://example.com/category',
  })
  @Expose()
  link: string;

  @ApiProperty({
    description: 'Category type',
    enum: ['photo', 'video'],
    example: 'photo',
  })
  @Expose()
  type: 'photo' | 'video';

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  @Expose()
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  @Expose()
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Number of templates in this category',
    example: 15,
  })
  @Expose()
  template_count?: number;
}
