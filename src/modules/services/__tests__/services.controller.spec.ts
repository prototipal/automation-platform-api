import { Test, TestingModule } from '@nestjs/testing';
import { ServicesController } from '../services.controller';
import { ServicesService } from '../services.service';
import { ServiceType, ServiceModel, TextToVideoModelVersion } from '../enums';
import { CreateServiceDto, UpdateServiceDto, QueryServiceDto } from '../dto';

describe('ServicesController', () => {
  let controller: ServicesController;
  let service: ServicesService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByModel: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockServiceResponse = {
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
      controllers: [ServicesController],
      providers: [
        {
          provide: ServicesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    service = module.get<ServicesService>(ServicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a service', async () => {
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

      mockService.create.mockResolvedValue(mockServiceResponse);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockServiceResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated services', async () => {
      const queryDto: QueryServiceDto = { page: 1, limit: 10 };
      const paginatedResponse = {
        data: [mockServiceResponse],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockService.findAll.mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('findOne', () => {
    it('should return a service by id', async () => {
      mockService.findOne.mockResolvedValue(mockServiceResponse);

      const result = await controller.findOne('test-id');

      expect(service.findOne).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockServiceResponse);
    });
  });

  describe('findByModel', () => {
    it('should return services by model', async () => {
      const services = [mockServiceResponse];
      mockService.findByModel.mockResolvedValue(services);

      const result = await controller.findByModel('google');

      expect(service.findByModel).toHaveBeenCalledWith('google');
      expect(result).toEqual(services);
    });
  });

  describe('update', () => {
    it('should update a service', async () => {
      const updateDto: UpdateServiceDto = {
        fields: {
          prompt: {
            required: true,
            type: 'string',
            desc: 'Updated prompt',
          },
        },
      };

      const updatedService = { ...mockServiceResponse, ...updateDto };
      mockService.update.mockResolvedValue(updatedService);

      const result = await controller.update('test-id', updateDto);

      expect(service.update).toHaveBeenCalledWith('test-id', updateDto);
      expect(result).toEqual(updatedService);
    });
  });

  describe('remove', () => {
    it('should remove a service', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove('test-id');

      expect(service.remove).toHaveBeenCalledWith('test-id');
    });
  });
});
