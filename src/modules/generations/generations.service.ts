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
import {
  ServiceModel,
  TextToImageModelVersion,
  TextToVideoModelVersion,
  ModelVersion,
} from '@/modules/services/enums';
import { ServiceFields } from '@/modules/services/entities';
import { AuthService, CreditDeductionDto, AuthUserDto } from '@/modules/auth';
import { StorageService } from '@/modules/storage';
import { SessionsService } from '@/modules/sessions';
import { PackagesService } from '@/modules/packages';
import { Generation } from './entities';
import { GenerationsRepository } from './generations.repository';
import {
  CreateGenerationDto,
  GenerationResponseDto,
  GenerationWithServiceResponseDto,
  ServiceInfoDto,
  EstimateGenerationPriceDto,
  PriceEstimationResponseDto,
  EstimateAllPricesDto,
  AllPricesResponseDto,
  ServicePriceDto,
  QueryGenerationDto,
} from './dto';
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
      [TextToImageModelVersion.IDEOGRAM_V3_TURBO]:
        'ideogram-ai/ideogram-v3-turbo',
    },
    [ServiceModel.BLACK_FOREST_LABS]: {
      [TextToImageModelVersion.FLUX_KONTEXT_MAX]:
        'black-forest-labs/flux-kontext-max',
    },
    [ServiceModel.WAN_VIDEO]: {},
    [ServiceModel.WAVESPEEDAI]: {},
  };

  constructor(
    private readonly generationsRepository: GenerationsRepository,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly servicesService: ServicesService,
    private readonly authService: AuthService,
    private readonly pricingCalculationService: PricingCalculationService,
    private readonly storageService: StorageService,
    private readonly sessionsService: SessionsService,
    private readonly packagesService: PackagesService,
  ) {
    this.replicateApiToken =
      this.configService.get<string>('REPLICATE_API_TOKEN') || '';

    if (!this.replicateApiToken) {
      this.logger.error('REPLICATE_API_TOKEN is not configured');
      throw new InternalServerErrorException(
        'Replicate API token is not configured',
      );
    }
  }

  async create(
    createGenerationDto: CreateGenerationDto,
  ): Promise<GenerationResponseDto> {
    this.logger.log(
      `Creating generation for model: ${createGenerationDto.model}, version: ${createGenerationDto.model_version}`,
    );

    // Step 1: Get service configuration for validation
    const serviceConfig = await this.getServiceConfiguration(
      createGenerationDto.model,
      createGenerationDto.model_version,
    );

    // Step 2: Validate input against service fields configuration
    await this.validateInputFields(
      createGenerationDto.input,
      serviceConfig.fields,
    );

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
    authUser: AuthUserDto,
  ): Promise<GenerationResponseDto> {
    this.logger.log(
      `Creating authenticated generation for user: ${authUser.user_id}, session: ${createGenerationDto.session_id}, model: ${createGenerationDto.model}, version: ${createGenerationDto.model_version}`,
    );

    // Step 1: Validate session ownership
    const sessionOwnership =
      await this.sessionsService.validateSessionOwnership(
        createGenerationDto.session_id,
        authUser.user_id,
      );

    if (!sessionOwnership) {
      throw new BadRequestException(
        `Session ${createGenerationDto.session_id} not found or access denied`,
      );
    }

    // Step 2: Get service configuration for validation and pricing
    const serviceConfig = await this.getServiceConfiguration(
      createGenerationDto.model,
      createGenerationDto.model_version,
    );

    // Check if this is a text-to-image model and handle multiple image generation
    const isTextToImage = this.isTextToImageModel(
      createGenerationDto.model,
      createGenerationDto.model_version,
    );
    const imageCount = isTextToImage ? createGenerationDto.image_count || 2 : 1;

    // Step 2: Calculate required credits (multiply by image count for text-to-image models)
    const baseCreditCost = await this.calculateRequiredCredits(
      serviceConfig,
      createGenerationDto.input,
    );
    const totalRequiredCredits = isTextToImage
      ? baseCreditCost * imageCount
      : baseCreditCost;

    this.logger.log(
      `Required credits for generation: ${totalRequiredCredits} (${baseCreditCost} x ${imageCount}) for user: ${authUser.user_id}`,
    );

    // Step 3: Check package limits (credits and generation count)
    const packageLimits = await this.packagesService.checkPackageLimits(authUser.user_id);
    
    if (!packageLimits.canGenerate) {
      this.logger.warn(
        `Package limits exceeded for user ${authUser.user_id}: ${packageLimits.reason}`,
      );
      throw new BadRequestException(
        `Generation not allowed: ${packageLimits.reason}. Credits remaining: ${packageLimits.creditsRemaining}, Generations remaining: ${packageLimits.generationsRemaining === -1 ? 'unlimited' : packageLimits.generationsRemaining}`,
      );
    }

    // Step 4: Check sufficient credits in package allowance
    if (packageLimits.creditsRemaining < totalRequiredCredits) {
      this.logger.warn(
        `Insufficient package credits for user ${authUser.user_id}. Required: ${totalRequiredCredits}, Available in package: ${packageLimits.creditsRemaining}`,
      );
      throw new BadRequestException(
        `Insufficient package credits. Required: ${totalRequiredCredits}, Available in current package: ${packageLimits.creditsRemaining}`,
      );
    }

    // Step 5: Check sufficient credits in user balance (fallback)
    const hasSufficientCredits = await this.authService.checkSufficientCredits(
      authUser.user_id,
      totalRequiredCredits,
    );

    if (!hasSufficientCredits) {
      this.logger.warn(
        `Insufficient account credits for user ${authUser.user_id}. Required: ${totalRequiredCredits}, Available: ${authUser.balance}`,
      );
      throw new BadRequestException(
        `Insufficient account credits. Required: ${totalRequiredCredits}, Available: ${authUser.balance}`,
      );
    }

    // Step 4: Deduct credits before making the API call
    const deductionDto: CreditDeductionDto = {
      user_id: authUser.user_id,
      amount: totalRequiredCredits,
      description: `Generation request - ${createGenerationDto.model} ${createGenerationDto.model_version}${isTextToImage ? ` (${imageCount} images)` : ''}`,
    };

    const deductionResult = await this.authService.deductCredits(deductionDto);
    this.logger.log(
      `Credits deducted successfully for user ${authUser.user_id}. New balance: ${deductionResult.remaining_balance}`,
    );

    try {
      // Step 5: Validate input against service fields configuration
      await this.validateInputFields(
        createGenerationDto.input,
        serviceConfig.fields,
      );

      // Step 6: Map to Replicate API endpoint
      const replicateEndpoint = this.buildReplicateEndpoint(
        createGenerationDto.model,
        createGenerationDto.model_version,
      );

      // Step 7: Make request(s) to Replicate API
      if (isTextToImage && imageCount > 1) {
        // Make multiple parallel requests for text-to-image models
        const requests = Array.from({ length: imageCount }, () =>
          this.callReplicateAPI(
            replicateEndpoint,
            createGenerationDto.input,
            serviceConfig,
          ),
        );

        const responses = await Promise.all(requests);

        // Combine all image outputs into a single response
        const combinedOutput = responses.reduce((acc, response) => {
          if (Array.isArray(response.output)) {
            return [...acc, ...response.output];
          } else if (response.output) {
            return [...acc, response.output];
          }
          return acc;
        }, []);

        const combinedResponse = {
          ...responses[0],
          output: combinedOutput,
          urls: {
            ...responses[0].urls,
            get: responses[0].urls?.get || responses[0].urls?.stream || '',
          },
        };

        this.logger.log(
          `Generation completed successfully for user: ${authUser.user_id}, Generated ${imageCount} images`,
        );

        // Save to database and upload to Supabase
        const savedGeneration = await this.saveGenerationAndUpload(
          combinedResponse,
          createGenerationDto,
          authUser.user_id,
          totalRequiredCredits,
          serviceConfig,
        );

        return plainToInstance(
          GenerationResponseDto,
          {
            ...combinedResponse,
            id: savedGeneration.id,
            supabase_urls: savedGeneration.supabase_urls,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      } else {
        // Single request for video models or single image
        const replicateResponse = await this.callReplicateAPI(
          replicateEndpoint,
          createGenerationDto.input,
          serviceConfig,
        );

        this.logger.log(
          `Generation completed successfully for user: ${authUser.user_id}, ID: ${replicateResponse.id}`,
        );

        // Save to database and upload to Supabase
        const savedGeneration = await this.saveGenerationAndUpload(
          replicateResponse,
          createGenerationDto,
          authUser.user_id,
          totalRequiredCredits,
          serviceConfig,
        );

        return plainToInstance(
          GenerationResponseDto,
          {
            ...replicateResponse,
            id: savedGeneration.id,
            supabase_urls: savedGeneration.supabase_urls,
          },
          {
            excludeExtraneousValues: true,
          },
        );
      }
    } catch (error) {
      // If API call fails, we could implement credit refund logic here
      this.logger.error(
        `Generation API call failed for user ${authUser.user_id}, credits were already deducted: ${totalRequiredCredits}`,
        error,
      );
      throw error;
    }
  }

  async estimatePrice(
    estimateDto: EstimateGenerationPriceDto,
  ): Promise<PriceEstimationResponseDto> {
    this.logger.log(
      `Estimating price for model: ${estimateDto.model}, version: ${estimateDto.model_version}`,
    );

    // Step 1: Get service configuration for pricing calculation
    const serviceConfig = await this.getServiceConfiguration(
      estimateDto.model,
      estimateDto.model_version,
    );

    // Step 2: Validate input against service fields configuration
    await this.validateInputFields(estimateDto.input, serviceConfig.fields);

    // Check if this is a text-to-image model and handle multiple image pricing
    const isTextToImage = this.isTextToImageModel(
      estimateDto.model,
      estimateDto.model_version,
    );
    const imageCount = isTextToImage ? estimateDto.image_count || 2 : 1;

    // Step 3: Calculate price estimation using the new credit system
    const basePriceEstimation = await this.calculatePriceEstimation(
      serviceConfig,
      estimateDto.input,
      estimateDto.model,
      estimateDto.model_version,
    );

    // Multiply by image count for text-to-image models
    if (isTextToImage && imageCount > 1) {
      basePriceEstimation.estimated_credits =
        basePriceEstimation.estimated_credits * imageCount;
      basePriceEstimation.breakdown.estimated_credits_rounded =
        basePriceEstimation.breakdown.estimated_credits_rounded * imageCount;
      basePriceEstimation.breakdown.estimated_credits_raw =
        basePriceEstimation.breakdown.estimated_credits_raw * imageCount;
      basePriceEstimation.breakdown.total_cost_usd =
        basePriceEstimation.breakdown.total_cost_usd * imageCount;
    }

    this.logger.log(
      `Price estimated successfully: ${basePriceEstimation.estimated_credits} credits (${imageCount} images) for ${estimateDto.model} ${estimateDto.model_version}`,
    );

    return plainToInstance(PriceEstimationResponseDto, basePriceEstimation, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Estimates pricing for all available services based on input parameters
   * @param estimateDto - Contains input parameters and optional image count
   * @returns Promise with all service price estimations
   */
  async estimateAllPrices(
    estimateDto: EstimateAllPricesDto,
  ): Promise<AllPricesResponseDto> {
    this.logger.log('Estimating prices for all available services');

    try {
      // Get all available services
      const allServices = await this.servicesService.findAllServices();

      const imageCount = estimateDto.image_count || 2;
      const servicePrices: ServicePriceDto[] = [];

      // Process each service
      for (const service of allServices) {
        try {
          // Check if service has pricing configuration
          if (!service.pricing || !service.pricing.rule) {
            this.logger.warn(
              `Skipping service ${service.model} ${service.model_version} - no pricing configuration`,
            );
            continue;
          }

          // Check if this is a text-to-image model
          const isTextToImage = this.isTextToImageModel(
            service.model,
            service.model_version,
          );
          const currentImageCount = isTextToImage ? imageCount : 1;

          // Calculate base price estimation
          const basePriceEstimation = await this.calculatePriceEstimation(
            service,
            estimateDto.input,
            service.model,
            service.model_version,
          );

          // Apply image count multiplier for text-to-image models
          if (isTextToImage && currentImageCount > 1) {
            basePriceEstimation.estimated_credits =
              basePriceEstimation.estimated_credits * currentImageCount;
            basePriceEstimation.breakdown.estimated_credits_rounded =
              basePriceEstimation.breakdown.estimated_credits_rounded *
              currentImageCount;
            basePriceEstimation.breakdown.estimated_credits_raw =
              basePriceEstimation.breakdown.estimated_credits_raw *
              currentImageCount;
            basePriceEstimation.breakdown.total_cost_usd =
              basePriceEstimation.breakdown.total_cost_usd * currentImageCount;
          }

          // Create service price entry with proper display name fallback
          const displayName =
            service.display_name ||
            `${service.model.replace(/_/g, ' ')} ${service.model_version?.replace(/_/g, ' ') || ''}`.trim();

          const servicePrice: ServicePriceDto = {
            model: service.model,
            model_version: service.model_version,
            display_name: displayName,
            service_type: isTextToImage ? 'image' : 'video',
            estimated_credits: basePriceEstimation.estimated_credits,
            breakdown: basePriceEstimation.breakdown,
            service_details: basePriceEstimation.service_details,
          };

          servicePrices.push(servicePrice);
        } catch (error) {
          this.logger.warn(
            `Failed to estimate price for ${service.model} ${service.model_version}: ${error.message}`,
          );
          // Continue with other services
        }
      }

      const response: AllPricesResponseDto = {
        services: servicePrices,
        input_used: estimateDto.input,
        image_count: imageCount,
        total_services: servicePrices.length,
      };

      this.logger.log(
        `Successfully estimated prices for ${servicePrices.length} services`,
      );

      return plainToInstance(AllPricesResponseDto, response, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      this.logger.error('Error estimating prices for all services:', error);
      throw new InternalServerErrorException(
        `Failed to estimate prices for all services: ${error.message}`,
      );
    }
  }

  /**
   * Calculates price estimation for a specific service configuration
   * @param serviceConfig - Service configuration with pricing rules
   * @param input - User input parameters for calculation
   * @param model - Service model enum
   * @param modelVersion - Model version enum
   * @returns Promise with detailed price estimation
   */
  private async calculatePriceEstimation(
    serviceConfig: any,
    input: Record<string, any>,
    model: ServiceModel,
    modelVersion: ModelVersion,
  ): Promise<PriceEstimationResponseDto> {
    try {
      if (!serviceConfig?.pricing?.rule) {
        const configId = serviceConfig?.id || 'unknown';
        this.logger.warn(
          `No pricing rule found for service config ID: ${configId}`,
        );
        throw new BadRequestException(
          'No pricing configuration found for this service',
        );
      }

      // Prepare calculation parameters from user input
      const calculationParams =
        this.pricingCalculationService.prepareCalculationParams(input);

      // Use the new price estimation method with detailed breakdown
      const priceEstimation =
        this.pricingCalculationService.createPriceEstimation(
          serviceConfig.pricing.rule,
          calculationParams,
          model,
          modelVersion,
        );

      if (
        priceEstimation.breakdown.estimated_credits_rounded === 0 &&
        priceEstimation.breakdown.replicate_cost_usd > 0
      ) {
        this.logger.warn(
          `Price estimation resulted in 0 credits, using fallback calculation`,
        );
        const fallbackCredits =
          this.pricingCalculationService.getDefaultCredits(
            serviceConfig.pricing.rule,
          );
        priceEstimation.estimated_credits = fallbackCredits;
        priceEstimation.breakdown.estimated_credits_rounded = fallbackCredits;
      }

      return priceEstimation;
    } catch (error) {
      this.logger.error('Error calculating price estimation:', error);
      throw new InternalServerErrorException(
        `Failed to calculate price estimation: ${error.message}`,
      );
    }
  }

  private async calculateRequiredCredits(
    serviceConfig: any,
    input: Record<string, any>,
  ): Promise<number> {
    try {
      if (!serviceConfig.pricing || !serviceConfig.pricing.rule) {
        this.logger.warn(
          `No pricing rule found for service config ID: ${serviceConfig.id}`,
        );
        return 0;
      }

      // Prepare calculation parameters from user input
      const calculationParams =
        this.pricingCalculationService.prepareCalculationParams(input);

      // Use the new credit calculation method with profit margin
      const creditResult =
        this.pricingCalculationService.calculateRequiredCredits(
          serviceConfig.pricing.rule,
          calculationParams,
        );

      if (creditResult.error) {
        this.logger.warn(`Credit calculation error: ${creditResult.error}`);
        // Fall back to default credits if calculation fails
        return this.pricingCalculationService.getDefaultCredits(
          serviceConfig.pricing.rule,
        );
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
      throw new InternalServerErrorException(
        'Failed to retrieve service configuration',
      );
    }
  }

  /**
   * Validates user input against service field specifications
   * @param input - User provided input parameters
   * @param serviceFields - Service field validation rules
   * @throws BadRequestException if validation fails
   */
  private async validateInputFields(
    input: Record<string, any>,
    serviceFields: ServiceFields,
  ): Promise<void> {
    const validationErrors: ValidationError[] = [];

    // Check for required fields and validate types
    for (const [fieldName, fieldConfig] of Object.entries(serviceFields)) {
      const fieldValue = input[fieldName];

      // Check if required field is missing
      if (
        fieldConfig.required &&
        (fieldValue === undefined || fieldValue === null || fieldValue === '')
      ) {
        validationErrors.push({
          field: fieldName,
          message: `Field '${fieldName}' is required`,
          value: fieldValue,
        });
        continue;
      }

      // Skip validation for optional fields that are not provided
      if (
        !fieldConfig.required &&
        (fieldValue === undefined || fieldValue === null)
      ) {
        continue;
      }

      // Validate field type and constraints
      const fieldType = fieldConfig.type;
      switch (fieldType) {
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
          const allowedValues = fieldConfig.values;
          if (!allowedValues || !allowedValues.includes(fieldValue)) {
            validationErrors.push({
              field: fieldName,
              message: `Field '${fieldName}' must be one of: ${allowedValues?.join(', ') || 'no values specified'}`,
              value: fieldValue,
            });
          }
          break;

        default:
          validationErrors.push({
            field: fieldName,
            message: `Field '${fieldName}' has unsupported type: ${fieldType}`,
            value: fieldValue,
          });
      }
    }

    // Check for unknown fields
    const allowedFields = Object.keys(serviceFields);
    const providedFields = Object.keys(input);
    const unknownFields = providedFields.filter(
      (field) => !allowedFields.includes(field),
    );

    if (unknownFields.length > 0) {
      unknownFields.forEach((field) => {
        validationErrors.push({
          field,
          message: `Unknown field '${field}' is not allowed`,
          value: input[field],
        });
      });
    }

    if (validationErrors.length > 0) {
      const errorMessage = validationErrors
        .map((error) => `${error.field}: ${error.message}`)
        .join('; ');

      throw new BadRequestException(`Validation failed: ${errorMessage}`);
    }
  }

  private buildReplicateEndpoint(
    model: ServiceModel,
    modelVersion: ModelVersion,
  ): string {
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
      const isTextToImage = this.isTextToImageModel(
        serviceConfig?.model,
        serviceConfig?.model_version,
      );

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.replicateApiToken}`,
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
          throw new InternalServerErrorException(
            'Unauthorized: Invalid Replicate API token',
          );
        }

        if (error.response?.status === 429) {
          throw new InternalServerErrorException(
            'Rate limit exceeded for Replicate API',
          );
        }

        throw new InternalServerErrorException(
          replicateError?.detail || `Replicate API error: ${error.message}`,
        );
      }

      throw new InternalServerErrorException(
        'Failed to communicate with Replicate API',
      );
    }
  }

  private isTextToImageModel(
    _model: ServiceModel,
    modelVersion: ModelVersion,
  ): boolean {
    const textToImageVersions = Object.values(
      TextToImageModelVersion,
    ) as string[];
    return textToImageVersions.includes(modelVersion);
  }

  /**
   * Save generation to database and upload files to Supabase
   */
  private async saveGenerationAndUpload(
    replicateResponse: ReplicateResponse,
    createGenerationDto: CreateGenerationDto,
    userId: string,
    creditsUsed: number,
    serviceConfig: any,
  ): Promise<Generation> {
    const startTime = Date.now();

    try {
      // Extract file URLs from Replicate response
      const fileUrls = this.extractFileUrls(replicateResponse);

      this.logger.log(
        `Found ${fileUrls.length} files to upload for generation ${replicateResponse.id}`,
      );

      // Upload files to Supabase in parallel
      let supabaseUrls: string[] = [];
      if (fileUrls.length > 0) {
        try {
          const uploadResults =
            await this.storageService.uploadMultipleFromUrls(fileUrls, {
              userId,
              sessionId: createGenerationDto.session_id,
              folder: 'generations',
              fileName: `gen_${replicateResponse.id}`,
              metadata: {
                model: createGenerationDto.model,
                model_version: createGenerationDto.model_version,
                replicate_id: replicateResponse.id,
              },
            });

          supabaseUrls = uploadResults.map((result) => result.public_url);
          this.logger.log(
            `Successfully uploaded ${supabaseUrls.length} files to Supabase`,
          );
        } catch (uploadError) {
          this.logger.error('Failed to upload files to Supabase:', uploadError);
          // Continue with saving the generation even if upload fails
          supabaseUrls = [];
        }
      }

      // Calculate processing time
      const processingTimeSeconds = (Date.now() - startTime) / 1000;

      // Create generation record using repository
      const savedGeneration = await this.generationsRepository.create({
        user_id: userId,
        session_id: createGenerationDto.session_id,
        replicate_id: replicateResponse.id,
        model: createGenerationDto.model,
        model_version: createGenerationDto.model_version,
        input_parameters: createGenerationDto.input,
        output_data: replicateResponse,
        status: this.mapReplicateStatus(replicateResponse.status),
        credits_used: creditsUsed,
        error_message: replicateResponse.error || undefined,
        supabase_urls: supabaseUrls.length > 0 ? supabaseUrls : undefined,
        processing_time_seconds: processingTimeSeconds,
        metadata: {
          image_count: createGenerationDto.image_count,
          service_config_id: serviceConfig.id,
          api_response_size: JSON.stringify(replicateResponse).length,
        },
      });

      this.logger.log(`Generation saved with ID: ${savedGeneration.id}`);
      
      // Update package usage counters
      try {
        await this.packagesService.updateUsageCounters(
          userId,
          creditsUsed,
          1 // One generation
        );
        this.logger.log(`Package usage updated for user ${userId}: +${creditsUsed} credits, +1 generation`);
      } catch (error) {
        this.logger.error(`Failed to update package usage for user ${userId}:`, error);
        // Don't throw error here as the generation was already successful
      }
      
      return savedGeneration;
    } catch (error) {
      this.logger.error('Failed to save generation:', error);
      throw new InternalServerErrorException(
        'Failed to save generation record',
      );
    }
  }

  /**
   * Extract file URLs from Replicate response (only media files, not API URLs)
   */
  private extractFileUrls(replicateResponse: ReplicateResponse): string[] {
    const urls: string[] = [];

    // Handle different response structures
    if (replicateResponse.output) {
      if (Array.isArray(replicateResponse.output)) {
        // Array of URLs
        replicateResponse.output.forEach((item: any) => {
          if (typeof item === 'string' && this.isMediaFileUrl(item)) {
            urls.push(item);
          }
        });
      } else if (
        typeof replicateResponse.output === 'string' &&
        this.isMediaFileUrl(replicateResponse.output)
      ) {
        // Single URL
        urls.push(replicateResponse.output);
      }
    }

    // Only return media file URLs, not API URLs
    return urls.filter((url) => url && url.length > 0);
  }

  /**
   * Check if URL is a media file (image/video) and not an API endpoint
   */
  private isMediaFileUrl(url: string): boolean {
    if (!url || !(url.startsWith('http://') || url.startsWith('https://'))) {
      return false;
    }

    // Skip API URLs
    if (
      url.includes('api.replicate.com') ||
      url.includes('replicate.com/p/') ||
      url.includes('/cancel') ||
      url.includes('/stream')
    ) {
      return false;
    }

    // Check for media file URLs (typically from replicate.delivery or similar)
    if (url.includes('replicate.delivery')) {
      return true;
    }

    // Check for common media file extensions
    const mediaExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.mp4',
      '.mov',
      '.avi',
      '.webm',
    ];
    return mediaExtensions.some((ext) => url.toLowerCase().includes(ext));
  }

  /**
   * Map Replicate status to our generation status
   */
  private mapReplicateStatus(
    status: string,
  ): 'pending' | 'processing' | 'completed' | 'failed' {
    switch (status?.toLowerCase()) {
      case 'succeeded':
      case 'success':
        return 'completed';
      case 'failed':
      case 'error':
        return 'failed';
      case 'processing':
      case 'starting':
        return 'processing';
      default:
        return 'pending';
    }
  }

  /**
   * Get generations by session ID
   */
  async getGenerationsBySession(
    sessionId: number,
    userId: string,
    queryDto?: QueryGenerationDto,
  ): Promise<{
    generations: GenerationWithServiceResponseDto[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    // Validate session ownership
    const sessionOwnership =
      await this.sessionsService.validateSessionOwnership(sessionId, userId);
    if (!sessionOwnership) {
      throw new BadRequestException(
        `Session ${sessionId} not found or access denied`,
      );
    }

    const query: QueryGenerationDto = queryDto || new QueryGenerationDto();
    const { generations, total } = await this.generationsRepository.findBySession(
      sessionId,
      userId,
      query,
    );

    // Fetch service information for each generation
    const transformedGenerations = await Promise.all(
      generations.map(async (generation) => {
        const service = await this.servicesService.findByModelAndVersion(
          generation.model,
          generation.model_version,
        );
        return this.transformGenerationWithService(generation, service);
      }),
    );

    return {
      generations: transformedGenerations,
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
    };
  }

  /**
   * Get user generations across all sessions
   */
  async getUserGenerations(
    userId: string,
    queryDto?: QueryGenerationDto,
  ): Promise<{
    generations: GenerationWithServiceResponseDto[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const query: QueryGenerationDto = queryDto || new QueryGenerationDto();
    const { generations, total } = await this.generationsRepository.findByUser(
      userId,
      query,
    );

    // Fetch service information for each generation
    const transformedGenerations = await Promise.all(
      generations.map(async (generation) => {
        const service = await this.servicesService.findByModelAndVersion(
          generation.model,
          generation.model_version,
        );
        return this.transformGenerationWithService(generation, service);
      }),
    );

    return {
      generations: transformedGenerations,
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
    };
  }

  /**
   * Transform generation entity to include service information
   */
  private transformGenerationWithService(
    generation: Generation,
    service?: any,
  ): GenerationWithServiceResponseDto {
    const serviceInfo: ServiceInfoDto | undefined = service
      ? {
          model: service.model,
          model_version: service.model_version || '',
          display_name:
            service.display_name ||
            `${service.model.replace(/_/g, ' ')} ${service.model_version?.replace(/_/g, ' ') || ''}`.trim(),
          logo: service.logo || undefined,
          type: service.type,
        }
      : undefined;

    return plainToInstance(
      GenerationWithServiceResponseDto,
      {
        id: generation.id,
        user_id: generation.user_id,
        session_id: generation.session_id,
        replicate_id: generation.replicate_id,
        model: generation.model,
        model_version: generation.model_version,
        input_parameters: generation.input_parameters,
        output_data: generation.output_data,
        status: generation.status,
        credits_used: generation.credits_used,
        error_message: generation.error_message,
        supabase_urls: generation.supabase_urls,
        created_at: generation.created_at,
        updated_at: generation.updated_at,
        processing_time_seconds: generation.processing_time_seconds,
        metadata: generation.metadata,
        service_info: serviceInfo,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  /**
   * Soft delete all generations for a session (cascade from session deactivation)
   */
  async softDeleteGenerationsBySession(
    sessionId: number,
    userId: string,
  ): Promise<number> {
    this.logger.log(
      `Soft deleting generations for session ${sessionId} and user ${userId}`,
    );

    try {
      const affectedRows = await this.generationsRepository.softDeleteBySession(
        sessionId,
        userId,
      );

      this.logger.log(
        `Soft deleted ${affectedRows} generations for session ${sessionId}`,
      );

      return affectedRows;
    } catch (error) {
      this.logger.error(
        `Failed to soft delete generations for session ${sessionId}:`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to soft delete generations',
      );
    }
  }

  /**
   * Soft delete a specific generation
   */
  async softDeleteGeneration(
    generationId: number,
    userId: string,
  ): Promise<boolean> {
    this.logger.log(
      `Soft deleting generation ${generationId} for user ${userId}`,
    );

    try {
      const success = await this.generationsRepository.softDelete(
        generationId,
        userId,
      );

      if (success) {
        this.logger.log(
          `Generation ${generationId} soft deleted successfully`,
        );
      } else {
        this.logger.warn(
          `Generation ${generationId} not found or already deleted`,
        );
      }

      return success;
    } catch (error) {
      this.logger.error(
        `Failed to soft delete generation ${generationId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to soft delete generation');
    }
  }

  /**
   * Restore a soft deleted generation
   */
  async restoreGeneration(
    generationId: number,
    userId: string,
  ): Promise<boolean> {
    this.logger.log(`Restoring generation ${generationId} for user ${userId}`);

    try {
      const success = await this.generationsRepository.restore(
        generationId,
        userId,
      );

      if (success) {
        this.logger.log(`Generation ${generationId} restored successfully`);
      } else {
        this.logger.warn(`Generation ${generationId} not found or not deleted`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to restore generation ${generationId}:`, error);
      throw new InternalServerErrorException('Failed to restore generation');
    }
  }
}
