import { Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PriceEstimationResponseDto } from './price-estimation-response.dto';

export class ServicePriceDto extends PriceEstimationResponseDto {
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
    description: 'Image count used for text-to-image services',
    example: 2,
  })
  @Expose()
  image_count: number;

  @ApiProperty({
    description: 'Total number of services',
    example: 8,
  })
  @Expose()
  total_services: number;
}