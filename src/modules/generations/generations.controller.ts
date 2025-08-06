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
} from '@nestjs/swagger';

import { GenerationsService } from './generations.service';
import { CreateGenerationDto, GenerationResponseDto } from './dto';
import { ApiKeyAuth, AuthUser, AuthUserDto } from '@/modules/auth';

@ApiTags('Generations')
@Controller('generations')
export class GenerationsController {
  private readonly logger = new Logger(GenerationsController.name);

  constructor(private readonly generationsService: GenerationsService) {}


  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiKeyAuth()
  @ApiOperation({
    summary: 'Generate content with API key authentication',
    description: `
      Creates a new generation request using API key authentication with automatic credit deduction.
      
      **Authentication Required:**
      - Valid API key (Bearer token, X-API-Key header, or api_key query parameter)
      - Active user account with sufficient credits
      
      **Credit System:**
      - Credits are automatically calculated based on model, parameters, and duration
      - Credits are deducted before making the generation request
      - If generation fails, credits are not refunded (as per industry standard)
      
      **Flow:**
      1. Validate API key and get user information
      2. Calculate required credits based on model and input parameters
      3. Check if user has sufficient credits
      4. Deduct credits from user account
      5. Validate input fields against service configuration
      6. Send request to Replicate API
      7. Return generation response
      
      **Authentication Methods:**
      - Bearer Token: \`Authorization: Bearer your-api-key\`
      - Header: \`X-API-Key: your-api-key\`
      - Query: \`?api_key=your-api-key\`
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Generation request created successfully with credit deduction',
    type: GenerationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data, validation errors, or insufficient credits',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'string', 
          example: 'Insufficient credits. Required: 1.50, Available: 0.80' 
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async generate(
    @Body() createGenerationDto: CreateGenerationDto,
    @AuthUser() user: AuthUserDto,
  ): Promise<GenerationResponseDto> {
    this.logger.log(
      `Creating authenticated generation for user: ${user.user_id}, model: ${createGenerationDto.model}, version: ${createGenerationDto.model_version}`,
    );

    try {
      const result = await this.generationsService.createWithAuth(createGenerationDto, user);
      
      this.logger.log(`Authenticated generation created successfully with ID: ${result.id} for user: ${user.user_id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create authenticated generation for user ${user.user_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}