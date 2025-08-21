import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsEnum, IsString, Min } from 'class-validator';
import { CreditType } from '@/modules/credits/enums';

export class CreditDeductionRequestDto {
  @ApiProperty({
    description: 'Amount of credits to deduct',
    example: 100,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Type of credits to deduct (if not specified, playground credits are tried first)',
    example: CreditType.PLAYGROUND,
    enum: CreditType,
    required: false,
  })
  @IsOptional()
  @IsEnum(CreditType)
  credit_type?: CreditType;

  @ApiProperty({
    description: 'Description of the credit deduction',
    example: 'Video generation - 30 seconds',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Additional metadata for the deduction',
    example: { service_id: 1, generation_id: 'gen_123' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreditDeductionResponseDto {
  @ApiProperty({
    description: 'Whether the deduction was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Amount of credits actually deducted',
    example: 100,
  })
  deducted_amount: number;

  @ApiProperty({
    description: 'Remaining playground credits after deduction',
    example: 650,
  })
  remaining_playground_credits: number;

  @ApiProperty({
    description: 'Remaining API credits after deduction',
    example: 500,
  })
  remaining_api_credits: number;

  @ApiProperty({
    description: 'Type of credits that were used for the deduction',
    example: CreditType.PLAYGROUND,
    enum: CreditType,
  })
  credit_type_used: CreditType;

  @ApiProperty({
    description: 'Error message if deduction failed',
    example: null,
    required: false,
  })
  error?: string;
}