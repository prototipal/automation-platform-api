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
import { ServiceModel, ModelVersion } from '@/modules/services/enums';
import { ServiceFields } from '@/modules/services/entities';
import { CreateGenerationDto, GenerationResponseDto } from './dto';
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
      [ModelVersion.VEO_3]: 'google-deepmind/veo-3',
      [ModelVersion.VEO_3_FAST]: 'google-deepmind/veo-3-fast',
    },
    [ServiceModel.KWAIGI]: {
      [ModelVersion.KLING_V2_1]: 'kwaivgi/kling-v2.1',
    },
    [ServiceModel.MINIMAX]: {
      [ModelVersion.HAILUO_02]: 'minimax/hailuo-02',
      [ModelVersion.VIDEO_01]: 'minimax/video-01',
    },
    [ServiceModel.BYTEDANCE]: {
      [ModelVersion.SEEDANCE_1_PRO]: 'bytedance/seedance-1-pro',
    },
    [ServiceModel.WAN_VIDEO]: {},
    [ServiceModel.WAVESPEEDAI]: {},
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly servicesService: ServicesService,
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
    );

    // Step 5: Transform and return response
    return plainToInstance(GenerationResponseDto, replicateResponse, {
      excludeExtraneousValues: true,
    });
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
  ): Promise<ReplicateResponse> {
    try {
      const requestData: ReplicateRequest = { input };
      
      this.logger.log(`Making request to Replicate API: ${endpoint}`);
      
      const response = await firstValueFrom(
        this.httpService.post<ReplicateResponse>(endpoint, requestData, {
          headers: {
            'Authorization': `Bearer ${this.replicateApiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 seconds timeout for async request
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
}