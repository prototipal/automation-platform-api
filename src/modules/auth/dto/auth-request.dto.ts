import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditType } from '@/modules/credits/enums';

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
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @IsString()
  user_id: string;

  @ApiProperty({
    description: 'Amount of credits to deduct',
    example: 1.5,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Type of credits to deduct (playground or api)',
    example: CreditType.API,
    enum: CreditType,
  })
  @IsOptional()
  @IsEnum(CreditType)
  credit_type?: CreditType;

  @ApiPropertyOptional({
    description: 'Description of the transaction',
    example: 'Video generation - VEO-3 model',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
