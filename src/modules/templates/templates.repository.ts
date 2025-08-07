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
    const { page = 1, limit = 10, category_id, category_name, type, search, sortBy = 'created_at', sortOrder = 'DESC' } = queryDto;
    
    const skip = (page - 1) * limit;

    let query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.category', 'category');

    if (category_id) {
      query = query.andWhere('template.category_id = :categoryId', { 
        categoryId: category_id 
      });
    }

    if (category_name) {
      query = query.andWhere('category.name ILIKE :categoryName', { 
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

    // Handle sorting - if sorting by category_name, sort by the related category name
    const orderField = sortBy === 'category_name' ? 'category.name' : `template.${sortBy}`;
    query = query
      .orderBy(orderField, sortOrder)
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
      relations: ['category'],
    });
  }

  async findById(id: string): Promise<Template | null> {
    return await this.templateRepository.findOne({
      where: { id },
      relations: ['category'],
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
      relations: ['category'],
      order: { created_at: 'DESC' },
    });
  }

  async findByCategoryId(categoryId: string): Promise<Template[]> {
    return await this.templateRepository.find({
      where: { category_id: categoryId },
      relations: ['category'],
      order: { created_at: 'DESC' },
    });
  }

  async findByCategory(categoryName: string): Promise<Template[]> {
    return await this.templateRepository
      .createQueryBuilder('template')
      .leftJoinAndSelect('template.category', 'category')
      .where('category.name ILIKE :categoryName', { 
        categoryName: `%${categoryName}%` 
      })
      .orderBy('template.created_at', 'DESC')
      .getMany();
  }

  async deleteAll(): Promise<void> {
    await this.templateRepository.delete({});
  }
}