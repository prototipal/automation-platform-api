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
import { CreateGenerationDto, GenerationResponseDto, EstimateGenerationPriceDto, PriceEstimationResponseDto } from './dto';
import { ApiKeyAuth, AuthUser, AuthUserDto, Public } from '@/modules/auth';

@ApiTags('Generations')
@Controller('generations')
export class GenerationsController {
  private readonly logger = new Logger(GenerationsController.name);

  constructor(private readonly generationsService: GenerationsService) {}

  @Post('estimate-price')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Estimate price for generation without authentication',
    description: `
      Estimates the credit cost for a generation request without actually performing the generation.
      
      **Public Endpoint:**
      - No authentication required
      - Returns detailed cost breakdown
      - Same input validation as generation endpoint
      
      **Response includes:**
      - Estimated credits required (always rounded up)
      - Detailed breakdown of calculation
      - Service information
      
      **Calculation Formula:**
      1. Get base Replicate service cost (USD)
      2. Apply profit margin: total_cost = base_cost × profit_margin
      3. Convert to credits: credits = total_cost ÷ credit_value
      4. Round up to avoid fractional credits
      
      **Example:**
      - Replicate cost: $0.08
      - Profit margin: 1.5 (50% profit)
      - Total cost: $0.08 × 1.5 = $0.12
      - Credit value: $0.05 (since $5 = 100 credits)
      - Required credits: $0.12 ÷ $0.05 = 2.4 → 3 credits (rounded up)
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Price estimation calculated successfully',
    type: PriceEstimationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'string', 
          example: 'Validation failed: prompt: Field \'prompt\' is required' 
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async estimatePrice(
    @Body() estimateDto: EstimateGenerationPriceDto,
  ): Promise<PriceEstimationResponseDto> {
    this.logger.log(
      `Estimating price for model: ${estimateDto.model}, version: ${estimateDto.model_version}`,
    );

    try {
      const estimation = await this.generationsService.estimatePrice(estimateDto);
      
      this.logger.log(
        `Price estimated successfully: ${estimation.estimated_credits} credits for ${estimateDto.model} ${estimateDto.model_version}`,
      );
      return estimation;
    } catch (error) {
      this.logger.error(
        `Failed to estimate price for ${estimateDto.model} ${estimateDto.model_version}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

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