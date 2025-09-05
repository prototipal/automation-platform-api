import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionType } from '../enums';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Name or title of the session',
    example: 'Product Photo Shoot Session',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the session',
    example: 'Session for generating product images for e-commerce',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Type of the session (photo or video). Defaults to photo.',
    enum: SessionType,
    example: SessionType.PHOTO,
  })
  @IsOptional()
  @IsEnum(SessionType)
  session_type?: SessionType;
}
