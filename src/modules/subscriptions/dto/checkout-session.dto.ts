import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsUrl,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { BillingInterval } from '@/modules/packages/enums';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Package ID to subscribe to',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  packageId: number;

  @ApiProperty({
    description: 'Billing interval for the subscription',
    example: BillingInterval.MONTH,
    enum: BillingInterval,
  })
  @IsEnum(BillingInterval)
  billingInterval: BillingInterval;

  @ApiPropertyOptional({
    description: 'Custom success URL (optional, uses default if not provided)',
    example: 'https://myapp.com/success',
  })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Custom cancel URL (optional, uses default if not provided)',
    example: 'https://myapp.com/cancel',
  })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class CheckoutSessionResponseDto {
  @ApiProperty({
    description: 'Stripe checkout session ID',
    example: 'cs_test_1234567890',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Stripe checkout URL',
    example:
      'https://checkout.stripe.com/c/pay/cs_test_1234567890#fidkdWxOYHw...',
  })
  url: string;

  @ApiProperty({
    description: 'Stripe customer ID',
    example: 'cus_1234567890',
  })
  customerId: string;
}
