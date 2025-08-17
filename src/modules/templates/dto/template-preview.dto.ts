import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TemplatePreviewDto {
  @ApiProperty({
    description: 'Template unique identifier',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Template image URL',
    example: 'https://example.com/image.jpg',
  })
  @Expose()
  image_url: string;

  @ApiProperty({
    description: 'Template prompt text',
    example: 'A beautiful landscape photo...',
  })
  @Expose()
  prompt: string;

  @ApiProperty({
    description: 'Template type',
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
}
