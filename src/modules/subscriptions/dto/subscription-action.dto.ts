import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CancelSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Whether to cancel immediately or at period end',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  cancelImmediately?: boolean = false;

  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Customer requested cancellation',
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}

export class ResumeSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Reason for resuming subscription',
    example: 'Customer changed mind',
  })
  @IsOptional()
  @IsString()
  resumeReason?: string;
}

export class SubscriptionActionResponseDto {
  @ApiProperty({
    description: 'Whether the action was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Action result message',
    example: 'Subscription cancelled successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Updated subscription status',
    example: 'cancelled',
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'When the cancellation will take effect',
    example: '2025-02-15T10:30:00.000Z',
  })
  effectiveDate?: Date;
}
