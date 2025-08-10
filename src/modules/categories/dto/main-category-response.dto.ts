import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { SubCategoryResponseDto } from './sub-category-response.dto';

export class MainCategoryResponseDto {
  @ApiProperty({
    description: 'Main category unique identifier',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  })
  @Expose()
  id: string;

  @ApiProperty({ 
    description: 'Main category name',
    example: 'Prototipal Halo'
  })
  @Expose()
  name: string;

  @ApiProperty({ 
    description: 'Main category type',
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

  @ApiProperty({
    description: 'Sub-categories under this main category',
    type: [SubCategoryResponseDto],
    isArray: true
  })
  @Expose()
  @Type(() => SubCategoryResponseDto)
  subCategories: SubCategoryResponseDto[];
}