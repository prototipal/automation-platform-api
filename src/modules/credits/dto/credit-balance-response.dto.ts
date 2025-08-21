import { ApiProperty } from '@nestjs/swagger';
import { CreditBalance } from '@/modules/credits/interfaces';

export class CreditBalanceResponseDto implements CreditBalance {
  @ApiProperty({
    description: 'Total playground credits allocated for current subscription period',
    example: 1000,
  })
  playground_credits: number;

  @ApiProperty({
    description: 'Total API credits available',
    example: 500,
  })
  api_credits: number;

  @ApiProperty({
    description: 'Available playground credits (total - used in current period)',
    example: 750,
  })
  available_playground_credits: number;

  @ApiProperty({
    description: 'Available API credits',
    example: 500,
  })
  available_api_credits: number;

  @ApiProperty({
    description: 'Total available credits across both types',
    example: 1250,
  })
  total_available_credits: number;

  @ApiProperty({
    description: 'Playground credits used in current subscription period',
    example: 250,
  })
  playground_credits_used_current_period: number;

  @ApiProperty({
    description: 'Total API credits used (lifetime)',
    example: 0,
  })
  api_credits_used_total: number;

  @ApiProperty({
    description: 'When playground credits were last reset',
    example: '2025-01-01T00:00:00.000Z',
    required: false,
  })
  playground_credits_last_reset?: Date;

  @ApiProperty({
    description: 'When playground credits will next reset',
    example: '2025-02-01T00:00:00.000Z',
    required: false,
  })
  playground_credits_next_reset?: Date;
}