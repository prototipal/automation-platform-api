import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import { GenerationsService } from '../generations.service';
import { ServicesService } from '@/modules/services/services.service';
import { ServiceModel, ModelVersion } from '@/modules/services/enums';
import { CreateGenerationDto } from '../dto';
import { ReplicateResponse } from '../interfaces';

describe('GenerationsService', () => {
  let service: GenerationsService;
  let configService: ConfigService;
  let httpService: HttpService;
  let servicesService: ServicesService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockServicesService = {
    findByModel: jest.fn(),
  };

  const mockServiceConfig = {
    id: 'test-service-id',
    model: ServiceModel.KWAIGI,
    model_version: ModelVersion.KLING_V2_1,
    fields: {
      prompt: {
        required: true,
        type: 'string' as const,
        desc: 'Text description of the video to generate',
      },
      start_image: {
        required: false,
        type: 'string' as const,
        desc: 'URL of the starting image',
      },
      duration: {
        required: false,
        type: 'enum' as const,
        values: ['5', '10'],
        desc: 'Video duration in seconds',
      },
    },
  };

  const mockReplicateResponse: ReplicateResponse = {
    id: 'pred_test123',
    status: 'starting',
    input: {
      prompt: 'test prompt',
      start_image: 'https://example.com/image.jpg',
    },
    created_at: '2024-08-05T10:30:00.000Z',
    model: 'kwaivgi/kling-v2.1',
  };

  beforeEach(async () => {
    // Setup default mocks before creating the module
    mockConfigService.get.mockReturnValue('test-replicate-token');
    mockServicesService.findByModel.mockResolvedValue([mockServiceConfig]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ServicesService,
          useValue: mockServicesService,
        },
      ],
    }).compile();

    service = module.get<GenerationsService>(GenerationsService);
    configService = module.get<ConfigService>(ConfigService);
    httpService = module.get<HttpService>(HttpService);
    servicesService = module.get<ServicesService>(ServicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if REPLICATE_API_TOKEN is not configured', () => {
      const mockConfigServiceEmpty = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new GenerationsService(mockConfigServiceEmpty as any, httpService, servicesService);
      }).toThrow(InternalServerErrorException);
    });
  });

  describe('create', () => {
    const validRequest: CreateGenerationDto = {
      model: ServiceModel.KWAIGI,
      model_version: ModelVersion.KLING_V2_1,
      input: {
        prompt: 'a woman takes her hands out her pockets',
        start_image: 'https://example.com/image.jpg',
      },
    };

    it('should successfully create a generation', async () => {
      const axiosResponse: AxiosResponse<ReplicateResponse> = {
        data: mockReplicateResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      const result = await service.create(validRequest);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockReplicateResponse.id);
      expect(result.status).toBe(mockReplicateResponse.status);
      expect(servicesService.findByModel).toHaveBeenCalledWith(ServiceModel.KWAIGI);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.replicate.com/v1/models/kwaivgi/kling-v2.1/predictions',
        { input: validRequest.input },
        {
          headers: {
            'Authorization': 'Bearer test-replicate-token',
            'Content-Type': 'application/json',
            'Prefer': 'wait',
          },
          timeout: 60000,
        },
      );
    });

    it('should throw NotFoundException when service configuration is not found', async () => {
      mockServicesService.findByModel.mockResolvedValue([]);

      await expect(service.create(validRequest)).rejects.toThrow(NotFoundException);
      await expect(service.create(validRequest)).rejects.toThrow(
        "No service configuration found for model 'kwaigi' with version 'kling-v2.1'",
      );
    });

    it('should throw BadRequestException for missing required field', async () => {
      const invalidRequest: CreateGenerationDto = {
        model: ServiceModel.KWAIGI,
        model_version: ModelVersion.KLING_V2_1,
        input: {
          start_image: 'https://example.com/image.jpg',
          // Missing required 'prompt' field
        },
      };

      await expect(service.create(invalidRequest)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidRequest)).rejects.toThrow(
        "Validation failed: prompt: Field 'prompt' is required",
      );
    });

    it('should throw BadRequestException for invalid field type', async () => {
      const invalidRequest: CreateGenerationDto = {
        model: ServiceModel.KWAIGI,
        model_version: ModelVersion.KLING_V2_1,
        input: {
          prompt: 123, // Should be string
          start_image: 'https://example.com/image.jpg',
        },
      };

      await expect(service.create(invalidRequest)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidRequest)).rejects.toThrow(
        "Validation failed: prompt: Field 'prompt' must be a string",
      );
    });

    it('should throw BadRequestException for invalid enum value', async () => {
      const serviceConfigWithEnum = {
        ...mockServiceConfig,
        fields: {
          ...mockServiceConfig.fields,
          duration: {
            required: true,
            type: 'enum' as const,
            values: ['5', '10'],
            desc: 'Video duration in seconds',
          },
        },
      };

      mockServicesService.findByModel.mockResolvedValue([serviceConfigWithEnum]);

      const invalidRequest: CreateGenerationDto = {
        model: ServiceModel.KWAIGI,
        model_version: ModelVersion.KLING_V2_1,
        input: {
          prompt: 'test prompt',
          duration: '15', // Invalid enum value
        },
      };

      await expect(service.create(invalidRequest)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidRequest)).rejects.toThrow(
        "Validation failed: duration: Field 'duration' must be one of: 5, 10",
      );
    });

    it('should throw BadRequestException for unknown fields', async () => {
      const invalidRequest: CreateGenerationDto = {
        model: ServiceModel.KWAIGI,
        model_version: ModelVersion.KLING_V2_1,
        input: {
          prompt: 'test prompt',
          unknown_field: 'value', // Unknown field
        },
      };

      await expect(service.create(invalidRequest)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidRequest)).rejects.toThrow(
        "Validation failed: unknown_field: Unknown field 'unknown_field' is not allowed",
      );
    });

    it('should throw BadRequestException for unsupported model', async () => {
      const invalidRequest: CreateGenerationDto = {
        model: ServiceModel.WAN_VIDEO, // Model without Replicate mapping
        model_version: ModelVersion.KLING_V2_1,
        input: {
          prompt: 'test prompt',
        },
      };

      const serviceConfigUnsupported = {
        ...mockServiceConfig,
        model: ServiceModel.WAN_VIDEO,
      };

      mockServicesService.findByModel.mockResolvedValue([serviceConfigUnsupported]);

      await expect(service.create(invalidRequest)).rejects.toThrow(BadRequestException);
      await expect(service.create(invalidRequest)).rejects.toThrow(
        "Model 'wan-video' is not supported for Replicate API integration",
      );
    });

    it('should handle Replicate API 400 error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            detail: 'Invalid input parameters',
          },
        },
        message: 'Request failed with status code 400',
      };

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.create(validRequest)).rejects.toThrow(BadRequestException);
      await expect(service.create(validRequest)).rejects.toThrow('Invalid input parameters');
    });

    it('should handle Replicate API 401 error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            detail: 'Unauthorized',
          },
        },
        message: 'Request failed with status code 401',
      };

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.create(validRequest)).rejects.toThrow(InternalServerErrorException);
      await expect(service.create(validRequest)).rejects.toThrow(
        'Unauthorized: Invalid Replicate API token',
      );
    });

    it('should handle Replicate API 429 error', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 429,
          data: {
            detail: 'Rate limit exceeded',
          },
        },
        message: 'Request failed with status code 429',
      };

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(service.create(validRequest)).rejects.toThrow(InternalServerErrorException);
      await expect(service.create(validRequest)).rejects.toThrow(
        'Rate limit exceeded for Replicate API',
      );
    });

    it('should handle general network errors', async () => {
      const networkError = new Error('Network timeout');
      mockHttpService.post.mockReturnValue(throwError(() => networkError));

      await expect(service.create(validRequest)).rejects.toThrow(InternalServerErrorException);
      await expect(service.create(validRequest)).rejects.toThrow(
        'Failed to communicate with Replicate API',
      );
    });

    it('should validate optional fields correctly', async () => {
      const requestWithOptionalField: CreateGenerationDto = {
        model: ServiceModel.KWAIGI,
        model_version: ModelVersion.KLING_V2_1,
        input: {
          prompt: 'test prompt',
          start_image: 'https://example.com/image.jpg',
        },
      };

      const axiosResponse: AxiosResponse<ReplicateResponse> = {
        data: mockReplicateResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(axiosResponse));

      const result = await service.create(requestWithOptionalField);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockReplicateResponse.id);
    });
  });
});