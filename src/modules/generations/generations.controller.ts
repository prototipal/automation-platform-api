import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

import { GenerationsService } from './generations.service';
import { CreateGenerationDto, GenerationResponseDto } from './dto';

@ApiTags('Generations')
@Controller('generations')
export class GenerationsController {
  private readonly logger = new Logger(GenerationsController.name);

  constructor(private readonly generationsService: GenerationsService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a video generation request',
    description: `
      Creates a new video generation request using the Replicate API.
      
      The request will be validated against the service configuration for the specified model and version.
      Input fields are dynamically validated based on the service's field configuration stored in the database.
      
      **Flow:**
      1. Validate model and model_version against available services
      2. Retrieve service configuration from database
      3. Validate input fields against service field rules (required, type, enum values)
      4. Map to appropriate Replicate API endpoint
      5. Send request to Replicate API with proper authentication
      6. Return the generation response with status and tracking information
      
      **Supported Models:**
      - kwaigi/kling-v2.1
      - minimax/hailuo-02
      - google-deepmind/veo-3
      - And others based on service configuration
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Video generation request created successfully',
    type: GenerationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'string', 
          example: 'Validation failed: prompt: Field \'prompt\' is required; start_image: Field \'start_image\' must be a string' 
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal server error or Replicate API issues',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Failed to communicate with Replicate API' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async create(
    @Body() createGenerationDto: CreateGenerationDto,
  ): Promise<GenerationResponseDto> {
    this.logger.log(
      `Creating generation request for model: ${createGenerationDto.model}, version: ${createGenerationDto.model_version}`,
    );

    try {
      const result = await this.generationsService.create(createGenerationDto);
      
      this.logger.log(`Generation created successfully with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create generation: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}