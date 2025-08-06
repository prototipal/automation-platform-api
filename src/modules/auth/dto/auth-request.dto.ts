import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyAuthRequestDto {
  @ApiProperty({
    description: 'API key for authentication',
    example: 'ak_12345abcdef',
  })
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

export class CreditDeductionDto {
  @ApiProperty({
    description: 'User ID for credit deduction',
    example: 1,
  })
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'Amount of credits to deduct',
    example: 1.50,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Description of the transaction',
    example: 'Video generation - VEO-3 model',
  })
  @IsOptional()
  @IsString()
  description?: string;
}