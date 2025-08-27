import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PriceEstimationResponseDto } from './price-estimation-response.dto';

export class ImageCountPricingDto {
  @ApiProperty({
    description: 'Number of images',
    example: 1,
  })
  @Expose()
  image_count: number;

  @ApiProperty({
    description: 'Estimated credits required for this image count',
    example: 3,
  })
  @Expose()
  estimated_credits: number;

  @ApiProperty({
    description: 'Total cost in USD for this image count',
    example: 0.12,
  })
  @Expose()
  total_cost_usd: number;
}

export class ServicePriceDto {
  @ApiProperty({
    description: 'Service model name',
    example: 'IDEOGRAM_AI',
  })
  @Expose()
  model: string;

  @ApiProperty({
    description: 'Service model version',
    example: 'IDEOGRAM_V3_TURBO',
  })
  @Expose()
  model_version: string;

  @ApiProperty({
    description: 'Display name for the service',
    example: 'Ideogram V3 Turbo',
  })
  @Expose()
  display_name: string;

  @ApiProperty({
    description: 'Service type (image or video)',
    example: 'image',
  })
  @Expose()
  service_type: string;

  @ApiProperty({
    description: 'Base pricing information (for 1 image or video)',
    type: PriceEstimationResponseDto,
  })
  @Expose()
  @Type(() => PriceEstimationResponseDto)
  base_pricing: PriceEstimationResponseDto;

  @ApiProperty({
    description:
      'Pricing for different image counts (only for text-to-image models)',
    type: [ImageCountPricingDto],
    required: false,
  })
  @Expose()
  @Type(() => ImageCountPricingDto)
  image_count_pricing?: ImageCountPricingDto[];
}

export class AllPricesResponseDto {
  @ApiProperty({
    description: 'List of all available services with their price estimations',
    type: [ServicePriceDto],
  })
  @Expose()
  @Type(() => ServicePriceDto)
  services: ServicePriceDto[];

  @ApiProperty({
    description: 'Input parameters used for estimation',
    type: 'object',
    additionalProperties: true,
  })
  @Expose()
  input_used: Record<string, any>;

  @ApiProperty({
    description: 'Total number of services',
    example: 8,
  })
  @Expose()
  total_services: number;
}
