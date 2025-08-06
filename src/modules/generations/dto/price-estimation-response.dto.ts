import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PriceBreakdownDto {
  @ApiProperty({
    description: 'Original Replicate service cost in USD',
    example: 0.08,
  })
  @Expose()
  replicate_cost_usd: number;

  @ApiProperty({
    description: 'Profit margin multiplier applied to base cost',
    example: 1.5,
  })
  @Expose()
  profit_margin: number;

  @ApiProperty({
    description: 'Total cost to user in USD after applying profit margin',
    example: 0.12,
  })
  @Expose()
  total_cost_usd: number;

  @ApiProperty({
    description: 'Value of one credit in USD ($5 = 100 credits = $0.05 per credit)',
    example: 0.05,
  })
  @Expose()
  credit_value_usd: number;

  @ApiProperty({
    description: 'Raw calculated credits (before rounding)',
    example: 2.4,
  })
  @Expose()
  estimated_credits_raw: number;

  @ApiProperty({
    description: 'Final credits required (always rounded up)',
    example: 3,
  })
  @Expose()
  estimated_credits_rounded: number;
}

export class ServiceDetailsDto {
  @ApiProperty({
    description: 'AI model used for estimation',
    example: 'BLACK_FOREST_LABS',
  })
  @Expose()
  model: string;

  @ApiProperty({
    description: 'Model version used for estimation',
    example: 'FLUX_KONTEXT_MAX',
  })
  @Expose()
  model_version: string;

  @ApiProperty({
    description: 'Pricing type used for calculation',
    example: 'fixed',
  })
  @Expose()
  pricing_type: string;
}

/**
 * Response DTO for price estimation endpoint
 */
export class PriceEstimationResponseDto {
  @ApiProperty({
    description: 'Estimated credits required for the generation',
    example: 3,
  })
  @Expose()
  estimated_credits: number;

  @ApiProperty({
    description: 'Detailed breakdown of price calculation',
    type: PriceBreakdownDto,
  })
  @Expose()
  @Type(() => PriceBreakdownDto)
  breakdown: PriceBreakdownDto;

  @ApiProperty({
    description: 'Details about the service used for estimation',
    type: ServiceDetailsDto,
  })
  @Expose()
  @Type(() => ServiceDetailsDto)
  service_details: ServiceDetailsDto;
}