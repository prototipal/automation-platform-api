import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

import { GenerationsController } from '../generations.controller';
import { GenerationsService } from '../generations.service';
import {
  ServiceModel,
  TextToVideoModelVersion,
  TextToImageModelVersion,
} from '@/modules/services/enums';
import { CreateGenerationDto, GenerationResponseDto } from '../dto';

describe('GenerationsController', () => {
  let controller: GenerationsController;
  let service: GenerationsService;

  const mockGenerationsService = {
    create: jest.fn(),
  };

  const mockGenerationResponse: GenerationResponseDto = {
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
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerationsController],
      providers: [
        {
          provide: GenerationsService,
          useValue: mockGenerationsService,
        },
      ],
    }).compile();

    controller = module.get<GenerationsController>(GenerationsController);
    service = module.get<GenerationsService>(GenerationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validRequest: CreateGenerationDto = {
      model: ServiceModel.KWAIGI,
      model_version: TextToVideoModelVersion.KLING_V2_1,
      input: {
        prompt: 'a woman takes her hands out her pockets',
        start_image: 'https://example.com/image.jpg',
      },
    };

    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should successfully create a generation', async () => {
      mockGenerationsService.create.mockResolvedValue(mockGenerationResponse);

      const result = await controller.create(validRequest);

      expect(result).toEqual(mockGenerationResponse);
      expect(service.create).toHaveBeenCalledWith(validRequest);
      expect(service.create).toHaveBeenCalledTimes(1);
    });

    it('should handle validation errors from service', async () => {
      const validationError = new BadRequestException(
        "Validation failed: prompt: Field 'prompt' is required",
      );

      mockGenerationsService.create.mockRejectedValue(validationError);

      await expect(controller.create(validRequest)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.create(validRequest)).rejects.toThrow(
        "Validation failed: prompt: Field 'prompt' is required",
      );
      expect(service.create).toHaveBeenCalledWith(validRequest);
    });

    it('should handle service configuration not found errors', async () => {
      const notFoundError = new NotFoundException(
        "No service configuration found for model 'kwaigi' with version 'kling-v2.1'",
      );

      mockGenerationsService.create.mockRejectedValue(notFoundError);

      await expect(controller.create(validRequest)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.create(validRequest)).rejects.toThrow(
        "No service configuration found for model 'kwaigi' with version 'kling-v2.1'",
      );
      expect(service.create).toHaveBeenCalledWith(validRequest);
    });

    it('should handle Replicate API errors', async () => {
      const apiError = new InternalServerErrorException(
        'Failed to communicate with Replicate API',
      );

      mockGenerationsService.create.mockRejectedValue(apiError);

      await expect(controller.create(validRequest)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(controller.create(validRequest)).rejects.toThrow(
        'Failed to communicate with Replicate API',
      );
      expect(service.create).toHaveBeenCalledWith(validRequest);
    });

    it('should handle different model types', async () => {
      const miniMaxRequest: CreateGenerationDto = {
        model: ServiceModel.MINIMAX,
        model_version: TextToVideoModelVersion.HAILUO_02,
        input: {
          prompt: 'test prompt for minimax',
        },
      };

      const miniMaxResponse: GenerationResponseDto = {
        ...mockGenerationResponse,
        id: 'pred_minimax123',
        model: 'minimax/hailuo-02',
        input: miniMaxRequest.input,
      };

      mockGenerationsService.create.mockResolvedValue(miniMaxResponse);

      const result = await controller.create(miniMaxRequest);

      expect(result).toEqual(miniMaxResponse);
      expect(service.create).toHaveBeenCalledWith(miniMaxRequest);
    });

    it('should handle requests with complex input objects', async () => {
      const complexRequest: CreateGenerationDto = {
        model: ServiceModel.KWAIGI,
        model_version: TextToVideoModelVersion.KLING_V2_1,
        input: {
          prompt: 'complex video generation prompt',
          start_image: 'https://example.com/start.jpg',
          end_image: 'https://example.com/end.jpg',
          duration: '10',
          style: 'cinematic',
          quality: 'high',
        },
      };

      const complexResponse: GenerationResponseDto = {
        ...mockGenerationResponse,
        input: complexRequest.input,
      };

      mockGenerationsService.create.mockResolvedValue(complexResponse);

      const result = await controller.create(complexRequest);

      expect(result).toEqual(complexResponse);
      expect(service.create).toHaveBeenCalledWith(complexRequest);
    });

    it('should propagate unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected system error');

      mockGenerationsService.create.mockRejectedValue(unexpectedError);

      await expect(controller.create(validRequest)).rejects.toThrow(
        'Unexpected system error',
      );
      expect(service.create).toHaveBeenCalledWith(validRequest);
    });

    it('should handle requests with minimal input', async () => {
      const minimalRequest: CreateGenerationDto = {
        model: ServiceModel.KWAIGI,
        model_version: TextToVideoModelVersion.KLING_V2_1,
        input: {
          prompt: 'minimal prompt',
        },
      };

      const minimalResponse: GenerationResponseDto = {
        ...mockGenerationResponse,
        input: minimalRequest.input,
      };

      mockGenerationsService.create.mockResolvedValue(minimalResponse);

      const result = await controller.create(minimalRequest);

      expect(result).toEqual(minimalResponse);
      expect(service.create).toHaveBeenCalledWith(minimalRequest);
    });
  });
});
