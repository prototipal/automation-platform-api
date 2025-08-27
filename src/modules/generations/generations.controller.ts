import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { GenerationsService } from './generations.service';
import {
  CreateGenerationDto,
  GenerationResponseDto,
  GenerationWithServiceResponseDto,
  EstimateGenerationPriceDto,
  PriceEstimationResponseDto,
  EstimateAllPricesDto,
  AllPricesResponseDto,
  QueryGenerationDto,
} from './dto';
import { HybridAuth, AuthUser, AuthUserDto, Public } from '@/modules/auth';

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
          example: "Validation failed: prompt: Field 'prompt' is required",
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
      const estimation =
        await this.generationsService.estimatePrice(estimateDto);

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

  @Post('estimate-all-prices')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'Estimate prices for all available services',
    description: `
      Returns price estimations for all available AI models/services without authentication.
      
      **Public Endpoint:**
      - No authentication required
      - Returns pricing for all configured services
      - Applies image count multiplier for text-to-image models
      
      **Response includes:**
      - List of all services with their base pricing information
      - Service details (model, version, type, display name)
      - For text-to-image models: pricing for 1, 2, and 4 images
      - For text-to-video models: single pricing (always 1 video)
      - Detailed cost breakdown for each service
      - Input parameters used for calculations
      
      **Use Cases:**
      - Display pricing table in frontend
      - Service comparison
      - Cost planning for users
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Price estimations calculated successfully for all services',
    type: AllPricesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data or validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Validation failed: input must be an object',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async estimateAllPrices(
    @Body() estimateDto: EstimateAllPricesDto,
  ): Promise<AllPricesResponseDto> {
    this.logger.log('Estimating prices for all available services');

    try {
      const estimations =
        await this.generationsService.estimateAllPrices(estimateDto);

      this.logger.log(
        `Successfully estimated prices for ${estimations.total_services} services`,
      );
      return estimations;
    } catch (error) {
      this.logger.error(
        `Failed to estimate prices for all services: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @HybridAuth()
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
    description:
      'Generation request created successfully with credit deduction',
    type: GenerationResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request data, validation errors, or insufficient credits',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Insufficient credits. Required: 1.50, Available: 0.80',
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
      const result = await this.generationsService.createWithAuth(
        createGenerationDto,
        user,
      );

      this.logger.log(
        `Authenticated generation created successfully with ID: ${result.id} for user: ${user.user_id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create authenticated generation for user ${user.user_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('by-session/:sessionId')
  @HybridAuth()
  @ApiOperation({
    summary: 'Get generations by session ID',
    description: `
      Retrieve all generations for a specific session with pagination.
      
      **Authentication Required:**
      - Valid API key
      - User must own the session
      
      **Features:**
      - Paginated results
      - Ordered by creation date (newest first)
      - Includes generation details and Supabase URLs
    `,
  })
  @ApiParam({
    name: 'sessionId',
    type: Number,
    description: 'Session ID to retrieve generations for',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Generations retrieved successfully with service information',
    schema: {
      type: 'object',
      properties: {
        generations: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/GenerationWithServiceResponseDto',
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        total_pages: { type: 'number' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Session not found or access denied',
  })
  async getGenerationsBySession(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Query() queryDto: QueryGenerationDto,
    @AuthUser() user: AuthUserDto,
  ) {
    this.logger.log(
      `Fetching generations for session ${sessionId}, user ${user.user_id}`,
    );

    try {
      const result = await this.generationsService.getGenerationsBySession(
        sessionId,
        user.user_id,
        queryDto,
      );

      this.logger.log(
        `Found ${result.generations.length} generations for session ${sessionId}, user ${user.user_id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch generations for session ${sessionId}, user ${user.user_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('user')
  @HybridAuth()
  @ApiOperation({
    summary: 'Get user generations across all sessions',
    description: `
      Retrieve all generations for the authenticated user with pagination.
      
      **Authentication Required:**
      - Valid API key
      
      **Features:**
      - Paginated results across all user sessions
      - Ordered by creation date (newest first)
      - Includes generation details and Supabase URLs
    `,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'User generations retrieved successfully with service information',
    schema: {
      type: 'object',
      properties: {
        generations: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/GenerationWithServiceResponseDto',
          },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        total_pages: { type: 'number' },
      },
    },
  })
  async getUserGenerations(
    @Query() queryDto: QueryGenerationDto,
    @AuthUser() user: AuthUserDto,
  ) {
    this.logger.log(`Fetching user generations for user ${user.user_id}`);

    try {
      const result = await this.generationsService.getUserGenerations(
        user.user_id,
        queryDto,
      );

      this.logger.log(
        `Found ${result.generations.length} generations for user ${user.user_id}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user generations for user ${user.user_id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
