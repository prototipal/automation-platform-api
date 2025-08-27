import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CsvImportRequestDto {
  @ApiPropertyOptional({
    enum: ['photo', 'video'],
    default: 'photo',
    description: 'Type for all imported templates',
  })
  @IsOptional()
  @IsEnum(['photo', 'video'])
  type?: 'photo' | 'video' = 'photo';

  @ApiPropertyOptional({
    description: 'Main category name to use for all categories',
    default: 'Prototipal Halo',
  })
  @IsOptional()
  @IsString()
  mainCategoryName?: string = 'Prototipal Halo';
}

export class CsvImportResponseDto {
  @ApiProperty({
    description: 'Number of templates successfully imported',
    example: 25,
  })
  imported: number;

  @ApiProperty({
    description: 'Number of categories created',
    example: 5,
  })
  categoriesCreated: number;

  @ApiProperty({
    description: 'Number of rows skipped due to errors',
    example: 2,
  })
  skipped: number;

  @ApiProperty({
    description: 'List of error messages',
    example: ['Row 3: Invalid image URL', 'Row 7: Missing prompt'],
    type: [String],
  })
  errors: string[];

  @ApiProperty({
    description: 'Summary message',
    example: 'Successfully imported 25 templates into 5 categories',
  })
  message: string;
}

export interface CsvRowData {
  name: string;
  prompt: string;
  new_image: string;
}