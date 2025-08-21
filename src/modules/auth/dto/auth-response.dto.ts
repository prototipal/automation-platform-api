import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CreditType } from '@/modules/credits/enums';

export class AuthUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '33653324-7e1d-4e6b-a46c-5f9997ec12ec',
  })
  @Expose()
  user_id: string;

  @ApiProperty({
    description: 'Current credit balance',
    example: 25.5,
  })
  @Expose()
  balance: number;

  @ApiPropertyOptional({
    description: 'User email',
    example: 'user@example.com',
  })
  @Expose()
  email?: string;

  @ApiPropertyOptional({
    description: 'User name',
    example: 'John Doe',
  })
  @Expose()
  name?: string;
}

export class CreditDeductionResponseDto {
  @ApiProperty({
    description: 'Whether the deduction was successful',
    example: true,
  })
  @Expose()
  success: boolean;

  @ApiProperty({
    description: 'Remaining balance after deduction',
    example: 24.0,
  })
  @Expose()
  remaining_balance: number;

  @ApiProperty({
    description: 'Amount deducted',
    example: 1.5,
  })
  @Expose()
  deducted_amount: number;

  @ApiPropertyOptional({
    description: 'Type of credits that were used',
    example: CreditType.API,
    enum: CreditType,
  })
  @Expose()
  credit_type_used?: CreditType;

  @ApiPropertyOptional({
    description: 'Remaining playground credits',
    example: 500,
  })
  @Expose()
  remaining_playground_credits?: number;

  @ApiPropertyOptional({
    description: 'Remaining API credits',
    example: 300,
  })
  @Expose()
  remaining_api_credits?: number;
}
