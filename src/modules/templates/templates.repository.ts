import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';

import { Template } from './entities';
import { CreateTemplateDto, QueryTemplateDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class TemplatesRepository {
  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
    const template = this.templateRepository.create({
      ...createTemplateDto,
      type: createTemplateDto.type || 'photo',
    });

    return await this.templateRepository.save(template);
  }

  async createMany(createTemplateDtos: CreateTemplateDto[]): Promise<Template[]> {
    const templates = this.templateRepository.create(
      createTemplateDtos.map(dto => ({
        ...dto,
        type: dto.type || 'photo',
      })),
    );

    return await this.templateRepository.save(templates);
  }

  async findAll(queryDto: QueryTemplateDto): Promise<PaginatedResult<Template>> {
    const { page = 1, limit = 10, category_name, type, search, sortBy = 'created_at', sortOrder = 'DESC' } = queryDto;
    
    const skip = (page - 1) * limit;
    
    const whereConditions: FindOptionsWhere<Template> = {};
    
    if (category_name) {
      whereConditions.category_name = ILike(`%${category_name}%`);
    }
    
    if (type) {
      whereConditions.type = type;
    }

    let query = this.templateRepository.createQueryBuilder('template');

    if (category_name) {
      query = query.andWhere('template.category_name ILIKE :categoryName', { 
        categoryName: `%${category_name}%` 
      });
    }

    if (type) {
      query = query.andWhere('template.type = :type', { type });
    }

    if (search) {
      query = query.andWhere('template.prompt ILIKE :search', { 
        search: `%${search}%` 
      });
    }

    query = query
      .orderBy(`template.${sortBy}`, sortOrder)
      .skip(skip)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Template | null> {
    return await this.templateRepository.findOne({
      where: { id },
    });
  }

  async findById(id: string): Promise<Template | null> {
    return await this.templateRepository.findOne({
      where: { id },
    });
  }

  async update(id: string, updateData: Partial<Template>): Promise<Template | null> {
    const result = await this.templateRepository.update(id, updateData);
    
    if (result.affected === 0) {
      return null;
    }
    
    return await this.findById(id);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.templateRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async count(): Promise<number> {
    return await this.templateRepository.count();
  }

  async findByType(type: 'photo' | 'video'): Promise<Template[]> {
    return await this.templateRepository.find({
      where: { type },
      order: { created_at: 'DESC' },
    });
  }

  async findByCategory(categoryName: string): Promise<Template[]> {
    return await this.templateRepository.find({
      where: { category_name: ILike(`%${categoryName}%`) },
      order: { created_at: 'DESC' },
    });
  }

  async deleteAll(): Promise<void> {
    await this.templateRepository.delete({});
  }
}