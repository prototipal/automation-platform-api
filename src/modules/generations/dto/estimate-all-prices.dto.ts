import { IsObject, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EstimateAllPricesDto {
  @ApiProperty({
    description:
      'Input parameters for the AI models (structure varies by model)',
    type: 'object',
    additionalProperties: true,
    example: {
      prompt: 'A beautiful sunset over mountains',
      aspect_ratio: '16:9',
    },
  })
  @IsObject()
  input: Record<string, any>;

  @ApiProperty({
    type: 'number',
    description:
      'Number of images to generate (only affects text-to-image models). Default is 2.',
    example: 2,
    required: false,
    minimum: 2,
    maximum: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(4)
  image_count?: number = 2;
}
