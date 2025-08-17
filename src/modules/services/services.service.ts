import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ServicesRepository } from './services.repository';
import { Service } from './entities';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceResponseDto,
  QueryServiceDto,
} from './dto';
import {
  ServiceModel,
  TextToImageModelVersion,
  TextToVideoModelVersion,
  ModelVersion,
} from './enums';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class ServicesService {
  constructor(private readonly servicesRepository: ServicesRepository) {}

  async create(
    createServiceDto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    // Validate model and version association
    this.validateModelVersionAssociation(
      createServiceDto.model,
      createServiceDto.model_version,
    );

    // Check if service with same model and version already exists
    const existingService = await this.servicesRepository.findByModelAndVersion(
      createServiceDto.model,
      createServiceDto.model_version,
    );

    if (existingService) {
      throw new ConflictException(
        `Service with model '${createServiceDto.model}' and version '${createServiceDto.model_version}' already exists`,
      );
    }

    // Validate fields structure
    this.validateFieldsStructure(createServiceDto.fields);

    const service = await this.servicesRepository.create(createServiceDto);
    return plainToInstance(ServiceResponseDto, service, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(
    queryDto: QueryServiceDto,
  ): Promise<PaginatedResponse<ServiceResponseDto>> {
    const [services, total] = await this.servicesRepository.findAll(queryDto);

    const data = services.map((service) =>
      plainToInstance(ServiceResponseDto, service, {
        excludeExtraneousValues: true,
      }),
    );

    const totalPages = Math.ceil(total / (queryDto.limit || 10));

    return {
      data,
      meta: {
        page: queryDto.page || 1,
        limit: queryDto.limit || 10,
        total,
        totalPages,
      },
    };
  }

  async findAllServices(): Promise<ServiceResponseDto[]> {
    const [services] = await this.servicesRepository.findAll({
      page: 1,
      limit: 1000,
    });

    return services.map((service) =>
      plainToInstance(ServiceResponseDto, service, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async findOne(id: string): Promise<ServiceResponseDto> {
    const service = await this.servicesRepository.findOne(id);

    if (!service) {
      throw new NotFoundException(`Service with ID '${id}' not found`);
    }

    return plainToInstance(ServiceResponseDto, service, {
      excludeExtraneousValues: true,
    });
  }

  async findByModel(model: string): Promise<ServiceResponseDto[]> {
    const services = await this.servicesRepository.findByModel(model);

    return services.map((service) =>
      plainToInstance(ServiceResponseDto, service, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async findByModelAndVersion(
    model: ServiceModel,
    modelVersion: ModelVersion,
  ): Promise<ServiceResponseDto | null> {
    const service = await this.servicesRepository.findByModelAndVersion(
      model,
      modelVersion,
    );

    if (!service) {
      return null;
    }

    return plainToInstance(ServiceResponseDto, service, {
      excludeExtraneousValues: true,
    });
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const existingService = await this.servicesRepository.findOne(id);

    if (!existingService) {
      throw new NotFoundException(`Service with ID '${id}' not found`);
    }

    // Validate model and version association if being updated
    if (updateServiceDto.model || updateServiceDto.model_version) {
      const model = updateServiceDto.model || existingService.model;
      const version =
        updateServiceDto.model_version !== undefined
          ? updateServiceDto.model_version
          : existingService.model_version;

      this.validateModelVersionAssociation(model, version);

      // Check for conflicts with other services
      if (updateServiceDto.model || updateServiceDto.model_version) {
        const conflictingService =
          await this.servicesRepository.findByModelAndVersion(
            model,
            version || undefined,
          );

        if (conflictingService && conflictingService.id !== id) {
          throw new ConflictException(
            `Another service with model '${model}' and version '${version}' already exists`,
          );
        }
      }
    }

    // Validate fields structure if being updated
    if (updateServiceDto.fields) {
      this.validateFieldsStructure(updateServiceDto.fields);
    }

    const updatedService = await this.servicesRepository.update(
      id,
      updateServiceDto,
    );

    if (!updatedService) {
      throw new NotFoundException(
        `Service with ID '${id}' not found after update`,
      );
    }

    return plainToInstance(ServiceResponseDto, updatedService, {
      excludeExtraneousValues: true,
    });
  }

  async remove(id: string): Promise<void> {
    const exists = await this.servicesRepository.exists(id);

    if (!exists) {
      throw new NotFoundException(`Service with ID '${id}' not found`);
    }

    const deleted = await this.servicesRepository.remove(id);

    if (!deleted) {
      throw new BadRequestException('Failed to delete service');
    }
  }

  private validateModelVersionAssociation(
    model: ServiceModel,
    version: ModelVersion | null | undefined,
  ): void {
    const modelVersionMap: Record<ServiceModel, ModelVersion[]> = {
      [ServiceModel.GOOGLE]: [
        TextToVideoModelVersion.VEO_3,
        TextToVideoModelVersion.VEO_3_FAST,
        TextToImageModelVersion.IMAGEN_4_FAST,
      ],
      [ServiceModel.KWAIGI]: [TextToVideoModelVersion.KLING_V2_1],
      [ServiceModel.MINIMAX]: [
        TextToVideoModelVersion.HAILUO_02,
        TextToVideoModelVersion.VIDEO_01,
      ],
      [ServiceModel.BYTEDANCE]: [TextToVideoModelVersion.SEEDANCE_1_PRO],
      [ServiceModel.WAN_VIDEO]: [],
      [ServiceModel.WAVESPEEDAI]: [],
      [ServiceModel.IDEOGRAM_AI]: [TextToImageModelVersion.IDEOGRAM_V3_TURBO],
      [ServiceModel.BLACK_FOREST_LABS]: [
        TextToImageModelVersion.FLUX_KONTEXT_MAX,
      ],
    };

    const allowedVersions = modelVersionMap[model];

    // If model doesn't have versions, version should be null
    if (allowedVersions.length === 0 && version) {
      throw new BadRequestException(
        `Model '${model}' does not support versions. Set model_version to null.`,
      );
    }

    // If model has versions but none provided, that's okay (optional)
    if (
      allowedVersions.length > 0 &&
      version &&
      !allowedVersions.includes(version)
    ) {
      throw new BadRequestException(
        `Invalid version '${version}' for model '${model}'. Allowed versions: ${allowedVersions.join(', ')}`,
      );
    }
  }

  private validateFieldsStructure(fields: any): void {
    if (!fields || typeof fields !== 'object') {
      throw new BadRequestException('Fields must be a valid object');
    }

    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      if (!fieldConfig || typeof fieldConfig !== 'object') {
        throw new BadRequestException(
          `Field '${fieldName}' must have a valid configuration object`,
        );
      }

      const config = fieldConfig as any;

      // Validate required properties
      if (typeof config.required !== 'boolean') {
        throw new BadRequestException(
          `Field '${fieldName}' must have a boolean 'required' property`,
        );
      }

      if (!['string', 'enum', 'boolean'].includes(config.type)) {
        throw new BadRequestException(
          `Field '${fieldName}' must have a valid 'type' property (string, enum, or boolean)`,
        );
      }

      if (typeof config.desc !== 'string' || !config.desc.trim()) {
        throw new BadRequestException(
          `Field '${fieldName}' must have a non-empty 'desc' property`,
        );
      }

      // Validate enum type has values
      if (
        config.type === 'enum' &&
        (!Array.isArray(config.values) || config.values.length === 0)
      ) {
        throw new BadRequestException(
          `Field '${fieldName}' with type 'enum' must have a non-empty 'values' array`,
        );
      }
    }
  }
}
