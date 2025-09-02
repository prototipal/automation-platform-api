import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Webhook processing status',
    example: 'success',
  })
  @Expose()
  status: 'success' | 'error' | 'ignored';

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Webhook processed successfully',
  })
  @Expose()
  message: string;

  @ApiProperty({
    description: 'Prediction ID that was processed',
    example: 'abc123def456',
  })
  @Expose()
  prediction_id: string;

  @ApiProperty({
    description: 'Processing timestamp',
    example: '2025-01-15T10:31:30.000Z',
  })
  @Expose()
  processed_at: string;
}