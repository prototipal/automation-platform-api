import { IsObject } from 'class-validator';
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
}
