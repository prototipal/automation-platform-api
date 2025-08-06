import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { plainToInstance } from 'class-transformer';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import { ServicesService } from '@/modules/services/services.service';
import { PricingCalculationService } from '@/modules/services/services/pricing-calculation.service';
import { ServiceModel, TextToImageModelVersion, TextToVideoModelVersion, ModelVersion } from '@/modules/services/enums';
import { ServiceFields } from '@/modules/services/entities';
import { AuthService, CreditDeductionDto, AuthUserDto } from '@/modules/auth';
import { CreateGenerationDto, GenerationResponseDto, EstimateGenerationPriceDto, PriceEstimationResponseDto } from './dto';
import {
  ReplicateRequest,
  ReplicateResponse,
  ReplicateErrorResponse,
  ValidationError,
  ModelVersionMapping,
} from './interfaces';

@Injectable()
export class GenerationsService {
  private readonly logger = new Logger(GenerationsService.name);
  private readonly replicateBaseUrl = 'https://api.replicate.com/v1/models';
  private readonly replicateApiToken: string;

  // Mapping of service models to Replicate API endpoints
  private readonly modelVersionMapping: ModelVersionMapping = {
    [ServiceModel.GOOGLE]: {
      [TextToVideoModelVersion.VEO_3]: 'google-deepmind/veo-3',
      [TextToVideoModelVersion.VEO_3_FAST]: 'google-deepmind/veo-3-fast',
      [TextToImageModelVersion.IMAGEN_4_FAST]: 'google/imagen-4-fast',
    },
    [ServiceModel.KWAIGI]: {
      [TextToVideoModelVersion.KLING_V2_1]: 'kwaivgi/kling-v2.1',
    },
    [ServiceModel.MINIMAX]: {
      [TextToVideoModelVersion.HAILUO_02]: 'minimax/hailuo-02',
      [TextToVideoModelVersion.VIDEO_01]: 'minimax/video-01',
    },
    [ServiceModel.BYTEDANCE]: {
      [TextToVideoModelVersion.SEEDANCE_1_PRO]: 'bytedance/seedance-1-pro',
    },
    [ServiceModel.IDEOGRAM_AI]: {
      [TextToImageModelVersion.IDEOGRAM_V3_TURBO]: 'ideogram-ai/ideogram-v3-turbo',
    },
    [ServiceModel.BLACK_FOREST_LABS]: {
      [TextToImageModelVersion.FLUX_KONTEXT_MAX]: 'black-forest-labs/flux-kontext-max',
    },
    [ServiceModel.WAN_VIDEO]: {},
    [ServiceModel.WAVESPEEDAI]: {},
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly servicesService: ServicesService,
    private readonly authService: AuthService,
    private readonly pricingCalculationService: PricingCalculationService,
  ) {
    this.replicateApiToken = this.configService.get<string>('REPLICATE_API_TOKEN') || '';
    
    if (!this.replicateApiToken) {
      this.logger.error('REPLICATE_API_TOKEN is not configured');
      throw new InternalServerErrorException('Replicate API token is not configured');
    }
  }

  async create(createGenerationDto: CreateGenerationDto): Promise<GenerationResponseDto> {
    this.logger.log(`Creating generation for model: ${createGenerationDto.model}, version: ${createGenerationDto.model_version}`);

    // Step 1: Get service configuration for validation
    const serviceConfig = await this.getServiceConfiguration(
      createGenerationDto.model,
      createGenerationDto.model_version,
    );

    // Step 2: Validate input against service fields configuration
    await this.validateInputFields(createGenerationDto.input, serviceConfig.fields);

    // Step 3: Map to Replicate API endpoint
    const replicateEndpoint = this.buildReplicateEndpoint(
      createGenerationDto.model,
      createGenerationDto.model_version,
    );

    // Step 4: Make request to Replicate API
    const replicateResponse = await this.callReplicateAPI(
      replicateEndpoint,
      createGenerationDto.input,
      serviceConfig,
    );

    // Step 5: Transform and return response
    return plainToInstance(GenerationResponseDto, replicateResponse, {
      excludeExtraneousValues: true,
    });
  }

  async createWithAuth(
    createGenerationDto: CreateGenerationDto, 
    authUser: AuthUserDto
  ): Promise<GenerationResponseDto> {
    this.logger.log(`Creating authenticated generation for user: ${authUser.user_id}, model: ${createGenerationDto.model}, version: ${createGenerationDto.model_version}`);

    // Step 1: Get service configuration for validation and pricing
    const serviceConfig = await this.getServiceConfiguration(
      createGenerationDto.model,
      createGenerationDto.model_version,
    );

    // Step 2: Calculate required credits
    const requiredCredits = await this.calculateRequiredCredits(
      serviceConfig,
      createGenerationDto.input,
    );

    this.logger.log(`Required credits for generation: ${requiredCredits} for user: ${authUser.user_id}`);

    // Step 3: Check sufficient credits
    const hasSufficientCredits = await this.authService.checkSufficientCredits(
      authUser.user_id,
      requiredCredits,
    );

    if (!hasSufficientCredits) {
      this.logger.warn(`Insufficient credits for user ${authUser.user_id}. Required: ${requiredCredits}, Available: ${authUser.balance}`);
      throw new BadRequestException(
        `Insufficient credits. Required: ${requiredCredits}, Available: ${authUser.balance}`,
      );
    }

    // Step 4: Deduct credits before making the API call
    const deductionDto: CreditDeductionDto = {
      user_id: authUser.user_id,
      amount: requiredCredits,
      description: `Generation request - ${createGenerationDto.model} ${createGenerationDto.model_version}`,
    };

    const deductionResult = await this.authService.deductCredits(deductionDto);
    this.logger.log(`Credits deducted successfully for user ${authUser.user_id}. New balance: ${deductionResult.remaining_balance}`);

    try {
      // Step 5: Validate input against service fields configuration
      await this.validateInputFields(createGenerationDto.input, serviceConfig.fields);

      // Step 6: Map to Replicate API endpoint
      const replicateEndpoint = this.buildReplicateEndpoint(
        createGenerationDto.model,
        createGenerationDto.model_version,
      );

      // Step 7: Make request to Replicate API
      const replicateResponse = await this.callReplicateAPI(
        replicateEndpoint,
        createGenerationDto.input,
        serviceConfig,
      );

      // Step 8: Transform and return response
      this.logger.log(`Generation completed successfully for user: ${authUser.user_id}, ID: ${replicateResponse.id}`);
      
      return plainToInstance(GenerationResponseDto, replicateResponse, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      // If API call fails, we could implement credit refund logic here
      this.logger.error(`Generation API call failed for user ${authUser.user_id}, credits were already deducted: ${requiredCredits}`, error);
      throw error;
    }
  }

  async estimatePrice(estimateDto: EstimateGenerationPriceDto): Promise<PriceEstimationResponseDto> {
    this.logger.log(`Estimating price for model: ${estimateDto.model}, version: ${estimateDto.model_version}`);

    // Step 1: Get service configuration for pricing calculation
    const serviceConfig = await this.getServiceConfiguration(
      estimateDto.model,
      estimateDto.model_version,
    );

    // Step 2: Validate input against service fields configuration
    await this.validateInputFields(estimateDto.input, serviceConfig.fields);

    // Step 3: Calculate price estimation using the new credit system
    const priceEstimation = await this.calculatePriceEstimation(
      serviceConfig,
      estimateDto.input,
      estimateDto.model,
      estimateDto.model_version,
    );

    this.logger.log(`Price estimated successfully: ${priceEstimation.estimated_credits} credits for ${estimateDto.model} ${estimateDto.model_version}`);

    return plainToInstance(PriceEstimationResponseDto, priceEstimation, {
      excludeExtraneousValues: true,
    });
  }

  private async calculatePriceEstimation(
    serviceConfig: any,
    input: Record<string, any>,
    model: ServiceModel,
    modelVersion: ModelVersion,
  ): Promise<PriceEstimationResponseDto> {
    try {
      console.log(serviceConfig);
      if (!serviceConfig.pricing || !serviceConfig.pricing.rule) {
        this.logger.warn(`No pricing rule found for service config ID: ${serviceConfig.id}`);
        throw new BadRequestException('No pricing configuration found for this service');
      }

      // Prepare calculation parameters from user input
      const calculationParams = this.pricingCalculationService.prepareCalculationParams(input);

      // Use the new price estimation method with detailed breakdown
      const priceEstimation = this.pricingCalculationService.createPriceEstimation(
        serviceConfig.pricing.rule,
        calculationParams,
        model,
        modelVersion,
      );

      if (priceEstimation.breakdown.estimated_credits_rounded === 0 && 
          priceEstimation.breakdown.replicate_cost_usd > 0) {
        this.logger.warn(`Price estimation resulted in 0 credits, using fallback calculation`);
        const fallbackCredits = this.pricingCalculationService.getDefaultCredits(serviceConfig.pricing.rule);
        priceEstimation.estimated_credits = fallbackCredits;
        priceEstimation.breakdown.estimated_credits_rounded = fallbackCredits;
      }

      return priceEstimation;
    } catch (error) {
      this.logger.error('Error calculating price estimation:', error);
      throw new InternalServerErrorException(`Failed to calculate price estimation: ${error.message}`);
    }
  }

  private async calculateRequiredCredits(
    serviceConfig: any,
    input: Record<string, any>,
  ): Promise<number> {
    try {
      if (!serviceConfig.pricing || !serviceConfig.pricing.rule) {
        this.logger.warn(`No pricing rule found for service config ID: ${serviceConfig.id}`);
        return 0;
      }

      // Prepare calculation parameters from user input
      const calculationParams = this.pricingCalculationService.prepareCalculationParams(input);

      // Use the new credit calculation method with profit margin
      const creditResult = this.pricingCalculationService.calculateRequiredCredits(
        serviceConfig.pricing.rule,
        calculationParams,
      );

      if (creditResult.error) {
        this.logger.warn(`Credit calculation error: ${creditResult.error}`);
        // Fall back to default credits if calculation fails
        return this.pricingCalculationService.getDefaultCredits(serviceConfig.pricing.rule);
      }

      this.logger.log(
        `Credit calculation completed: ${creditResult.estimated_credits} credits ` +
        `(USD: $${creditResult.breakdown.replicate_cost_usd} -> $${creditResult.breakdown.total_cost_usd} with ${creditResult.breakdown.profit_margin}x margin)`,
      );

      return creditResult.estimated_credits;
    } catch (error) {
      this.logger.error('Error calculating required credits:', error);
      return 0;
    }
  }

  private async getServiceConfiguration(
    model: ServiceModel,
    modelVersion: ModelVersion,
  ) {
    try {
      // Find services that match the model and version
      const services = await this.servicesService.findByModel(model);
      
      const matchingService = services.find(
        (service) => service.model_version === modelVersion,
      );

      if (!matchingService) {
        throw new NotFoundException(
          `No service configuration found for model '${model}' with version '${modelVersion}'`,
        );
      }

      return matchingService;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error('Error retrieving service configuration:', error);
      throw new InternalServerErrorException('Failed to retrieve service configuration');
    }
  }

  private async validateInputFields(
    input: Record<string, any>,
    serviceFields: ServiceFields,
  ): Promise<void> {
    const validationErrors: ValidationError[] = [];

    // Check for required fields
    for (const [fieldName, fieldConfig] of Object.entries(serviceFields)) {
      const fieldValue = input[fieldName];

      // Check if required field is missing
      if (fieldConfig.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        validationErrors.push({
          field: fieldName,
          message: `Field '${fieldName}' is required`,
          value: fieldValue,
        });
        continue;
      }

      // Skip validation for optional fields that are not provided
      if (!fieldConfig.required && (fieldValue === undefined || fieldValue === null)) {
        continue;
      }

      // Validate field type and constraints
      switch (fieldConfig.type) {
        case 'string':
          if (typeof fieldValue !== 'string') {
            validationErrors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be a string`,
              value: fieldValue,
            });
          }
          break;

        case 'boolean':
          if (typeof fieldValue !== 'boolean') {
            validationErrors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be a boolean`,
              value: fieldValue,
            });
          }
          break;

        case 'enum':
          if (!fieldConfig.values || !fieldConfig.values.includes(fieldValue)) {
            validationErrors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be one of: ${fieldConfig.values?.join(', ')}`,
              value: fieldValue,
            });
          }
          break;

        default:
          validationErrors.push({
            field: fieldName,
            message: `Field '${fieldName}' has unsupported type: ${fieldConfig.type}`,
            value: fieldValue,
          });
      }
    }

    // Check for unknown fields
    const allowedFields = Object.keys(serviceFields);
    const providedFields = Object.keys(input);
    const unknownFields = providedFields.filter(field => !allowedFields.includes(field));

    if (unknownFields.length > 0) {
      unknownFields.forEach(field => {
        validationErrors.push({
          field,
          message: `Unknown field '${field}' is not allowed`,
          value: input[field],
        });
      });
    }

    if (validationErrors.length > 0) {
      const errorMessage = validationErrors
        .map(error => `${error.field}: ${error.message}`)
        .join('; ');
      
      throw new BadRequestException(`Validation failed: ${errorMessage}`);
    }
  }

  private buildReplicateEndpoint(model: ServiceModel, modelVersion: ModelVersion): string {
    const modelMapping = this.modelVersionMapping[model];
    
    if (!modelMapping || Object.keys(modelMapping).length === 0) {
      throw new BadRequestException(
        `Model '${model}' is not supported for Replicate API integration`,
      );
    }

    const replicateModel = modelMapping[modelVersion];
    
    if (!replicateModel) {
      throw new BadRequestException(
        `Model version '${modelVersion}' is not supported for model '${model}'`,
      );
    }

    return `${this.replicateBaseUrl}/${replicateModel}/predictions`;
  }

  private async callReplicateAPI(
    endpoint: string,
    input: Record<string, any>,
    serviceConfig?: any,
  ): Promise<ReplicateResponse> {
    try {
      const requestData: ReplicateRequest = { input };
      
      this.logger.log(`Making request to Replicate API: ${endpoint}`);
      
      // Check if this is a text-to-image model to add wait header
      const isTextToImage = this.isTextToImageModel(serviceConfig?.model, serviceConfig?.model_version);
      
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.replicateApiToken}`,
        'Content-Type': 'application/json',
      };

      // Add Prefer: wait header for text-to-image models
      if (isTextToImage) {
        headers['Prefer'] = 'wait';
        this.logger.log('Added Prefer: wait header for text-to-image request');
      }
      
      const response = await firstValueFrom(
        this.httpService.post<ReplicateResponse>(endpoint, requestData, {
          headers,
          timeout: isTextToImage ? 60000 : 10000, // 60 seconds for text-to-image, 10 seconds for video
        }),
      );

      this.logger.log(`Replicate API response status: ${response.status}`);
      return response.data;
    } catch (error) {
      this.logger.error('Error calling Replicate API:', error);
      
      if (error instanceof AxiosError) {
        const replicateError = error.response?.data as ReplicateErrorResponse;
        
        if (error.response?.status === 400) {
          throw new BadRequestException(
            replicateError?.detail || 'Invalid request to Replicate API',
          );
        }
        
        if (error.response?.status === 401) {
          throw new InternalServerErrorException('Unauthorized: Invalid Replicate API token');
        }
        
        if (error.response?.status === 429) {
          throw new InternalServerErrorException('Rate limit exceeded for Replicate API');
        }
        
        throw new InternalServerErrorException(
          replicateError?.detail || `Replicate API error: ${error.message}`,
        );
      }
      
      throw new InternalServerErrorException('Failed to communicate with Replicate API');
    }
  }

  private isTextToImageModel(_model: ServiceModel, modelVersion: ModelVersion): boolean {
    const textToImageVersions = Object.values(TextToImageModelVersion) as string[];
    return textToImageVersions.includes(modelVersion);
  }
}