import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSessionDto {
  @ApiPropertyOptional({
    description: 'Updated name or title of the session',
    example: 'Updated Product Photo Shoot Session',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated description of the session',
    example: 'Updated session description for generating product images',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the session is active',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}