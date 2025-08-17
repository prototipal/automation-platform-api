import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { Service } from './entities';
import { CreateServiceDto, UpdateServiceDto, QueryServiceDto } from './dto';

@Injectable()
export class ServicesRepository {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const service = this.serviceRepository.create(createServiceDto);
    return await this.serviceRepository.save(service);
  }

  async findAll(queryDto: QueryServiceDto): Promise<[Service[], number]> {
    const { page = 1, limit = 10, ...filters } = queryDto;

    const where: FindOptionsWhere<Service> = {
      is_active: true, // Only return active services
    };

    if (filters.type) where.type = filters.type;
    if (filters.model) where.model = filters.model;
    if (filters.model_version) where.model_version = filters.model_version;
    if (filters.from) where.from = filters.from;

    const options: FindManyOptions<Service> = {
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: {
        created_at: 'DESC',
      },
    };

    return await this.serviceRepository.findAndCount(options);
  }

  async findOne(id: string): Promise<Service | null> {
    return await this.serviceRepository.findOne({
      where: { id },
    });
  }

  async findByModelAndVersion(
    model: string,
    version?: string,
  ): Promise<Service | null> {
    const where: FindOptionsWhere<Service> = {
      model: model as any,
      is_active: true, // Only consider active services
    };
    if (version) {
      where.model_version = version as any;
    }

    return await this.serviceRepository.findOne({ where });
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service | null> {
    await this.serviceRepository.update(id, updateServiceDto);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.serviceRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.serviceRepository.count({
      where: { id },
    });
    return count > 0;
  }

  async findByModel(model: string): Promise<Service[]> {
    return await this.serviceRepository.find({
      where: {
        model: model as any,
        is_active: true, // Only return active services
      },
      order: {
        model_version: 'ASC',
      },
    });
  }
}
