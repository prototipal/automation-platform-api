import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LatestGenerationDto } from './latest-generation.dto';

export class SessionResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the session',
    example: 1,
  })
  @Expose()
  id: number;

  @ApiProperty({
    description: 'ID of the user who owns this session',
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @Expose()
  user_id: string;

  @ApiProperty({
    description: 'Name or title of the session',
    example: 'Product Photo Shoot Session',
  })
  @Expose()
  name: string;

  @ApiProperty({
    description: 'Optional description of the session',
    example: 'Session for generating product images for e-commerce',
    required: false,
  })
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'Whether the session is active',
    example: true,
  })
  @Expose()
  is_active: boolean;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2025-01-15T10:30:00.000Z',
  })
  @Expose()
  @Type(() => Date)
  created_at: Date;

  @ApiProperty({
    description: 'Session last update timestamp',
    example: '2025-01-15T15:45:00.000Z',
  })
  @Expose()
  @Type(() => Date)
  updated_at: Date;

  @ApiProperty({
    description: 'Count of generations in this session',
    example: 5,
    required: false,
  })
  @Expose()
  generation_count?: number;

  @ApiProperty({
    description: 'Total credits spent in this session',
    example: 12.5,
    required: false,
  })
  @Expose()
  total_credits_spent?: number;

  @ApiProperty({
    description: 'Latest generation in this session',
    type: LatestGenerationDto,
    required: false,
  })
  @Expose()
  @Type(() => LatestGenerationDto)
  latest_generation?: LatestGenerationDto;
}
