import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import { CreateServiceDto } from './create-service.dto';
import type { ServiceFields } from '../entities';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {
  @ApiPropertyOptional({
    description: 'Updated field specifications for the model',
    type: 'object',
    additionalProperties: true,
    example: {
      prompt: {
        required: true,
        type: 'string',
        desc: 'Updated text description for video generation',
      },
    },
  })
  @IsOptional()
  @IsObject()
  fields?: ServiceFields;
}
