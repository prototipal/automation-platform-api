import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ServicesService } from '../services.service';
import { ServicesRepository } from '../services.repository';
import { ServiceType, ServiceModel, TextToVideoModelVersion } from '../enums';
import { CreateServiceDto, UpdateServiceDto } from '../dto';

describe('ServicesService', () => {
  let service: ServicesService;

  const mockRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByModelAndVersion: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
    findByModel: jest.fn(),
  };

  const mockService = {
    id: 'test-id',
    from: 'replicate',
    type: ServiceType.IMAGE_TO_VIDEO,
    model: ServiceModel.GOOGLE,
    model_version: TextToVideoModelVersion.VEO_3,
    fields: {
      prompt: {
        required: true,
        type: 'string',
        desc: 'Test prompt',
      },
    },
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: ServicesRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a service successfully', async () => {
      const createDto: CreateServiceDto = {
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.GOOGLE,
        model_version: TextToVideoModelVersion.VEO_3,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Test prompt',
          },
        },
      };

      mockRepository.findByModelAndVersion.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockService);

      const result = await service.create(createDto);

      expect(mockRepository.findByModelAndVersion).toHaveBeenCalledWith(
        ServiceModel.GOOGLE,
        TextToVideoModelVersion.VEO_3,
      );
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(result).toMatchObject({
        id: mockService.id,
        type: mockService.type,
        model: mockService.model,
      });
    });

    it('should throw ConflictException if service already exists', async () => {
      const createDto: CreateServiceDto = {
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.GOOGLE,
        model_version: TextToVideoModelVersion.VEO_3,
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Test prompt',
          },
        },
      };

      mockRepository.findByModelAndVersion.mockResolvedValue(mockService);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for invalid model-version association', async () => {
      const createDto: CreateServiceDto = {
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.GOOGLE,
        model_version: TextToVideoModelVersion.HAILUO_02, // Invalid for Google
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Test prompt',
          },
        },
      };

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid fields structure', async () => {
      const createDto: CreateServiceDto = {
        type: ServiceType.IMAGE_TO_VIDEO,
        model: ServiceModel.GOOGLE,
        model_version: TextToVideoModelVersion.VEO_3,
        fields: {
          prompt: {
            required: 'invalid', // Should be boolean
            type: 'string',
            desc: 'Test prompt',
          } as any,
        },
      };

      // Ensure no existing service is found
      mockRepository.findByModelAndVersion.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated services', async () => {
      const queryDto = { page: 1, limit: 10 };
      const services = [mockService];
      const total = 1;

      mockRepository.findAll.mockResolvedValue([services, total]);

      const result = await service.findAll(queryDto);

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockService.id,
            type: mockService.type,
          }),
        ]),
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a service by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockService);

      const result = await service.findOne('test-id');

      expect(mockRepository.findOne).toHaveBeenCalledWith('test-id');
      expect(result).toMatchObject({
        id: mockService.id,
        type: mockService.type,
      });
    });

    it('should throw NotFoundException if service not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a service successfully', async () => {
      const updateDto: UpdateServiceDto = {
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Updated prompt',
          },
        },
      };

      mockRepository.findOne.mockResolvedValue(mockService);
      mockRepository.update.mockResolvedValue({ ...mockService, ...updateDto });

      const result = await service.update('test-id', updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith('test-id');
      expect(mockRepository.update).toHaveBeenCalledWith('test-id', updateDto);
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if service not found', async () => {
      const updateDto: UpdateServiceDto = {};

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a service successfully', async () => {
      mockRepository.exists.mockResolvedValue(true);
      mockRepository.remove.mockResolvedValue(true);

      await service.remove('test-id');

      expect(mockRepository.exists).toHaveBeenCalledWith('test-id');
      expect(mockRepository.remove).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException if service not found', async () => {
      mockRepository.exists.mockResolvedValue(false);

      await expect(service.remove('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
