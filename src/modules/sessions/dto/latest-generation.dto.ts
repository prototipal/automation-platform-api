import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LatestGenerationDto {
  @ApiProperty({
    description: 'Generation ID',
    example: 123,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'Generation name or prompt from input_parameters',
    example: 'Beautiful sunset landscape',
    required: false,
  })
  @Expose()
  name?: string;

  @ApiProperty({
    description: 'First image URL from supabase_urls',
    example:
      'https://supabase.com/storage/v1/object/public/generations/abc123.jpg',
    required: false,
  })
  @Expose()
  image_url?: string;

  @ApiProperty({
    description: 'Generation creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @Expose()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'Generation status',
    example: 'completed',
    enum: ['pending', 'starting', 'processing', 'completed', 'failed'],
  })
  @Expose()
  status: 'pending' | 'starting' | 'processing' | 'completed' | 'failed';
}
