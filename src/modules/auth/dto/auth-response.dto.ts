import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AuthUserDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  @Expose()
  user_id: number;

  @ApiProperty({
    description: 'Current credit balance',
    example: 25.50,
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
    example: 24.00,
  })
  @Expose()
  remaining_balance: number;

  @ApiProperty({
    description: 'Amount deducted',
    example: 1.50,
  })
  @Expose()
  deducted_amount: number;
}