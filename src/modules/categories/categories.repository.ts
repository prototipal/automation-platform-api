import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';

import { Category } from './entities';
import { CreateCategoryDto, QueryCategoryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create({
      ...createCategoryDto,
      type: createCategoryDto.type || 'photo',
    });

    return await this.categoryRepository.save(category);
  }

  async createMany(createCategoryDtos: CreateCategoryDto[]): Promise<Category[]> {
    const categories = this.categoryRepository.create(
      createCategoryDtos.map(dto => ({
        ...dto,
        type: dto.type || 'photo',
      })),
    );

    return await this.categoryRepository.save(categories);
  }

  async findAll(queryDto: QueryCategoryDto): Promise<PaginatedResult<Category>> {
    const { 
      page = 1, 
      limit = 10, 
      name, 
      type, 
      sort_by = 'created_at', 
      sort_order = 'DESC',
      include_template_count = false
    } = queryDto;
    
    const skip = (page - 1) * limit;

    let query = this.categoryRepository.createQueryBuilder('category');

    if (name) {
      query = query.andWhere('category.name ILIKE :name', { 
        name: `%${name}%` 
      });
    }

    if (type) {
      query = query.andWhere('category.type = :type', { type });
    }

    if (include_template_count) {
      query = query
        .leftJoinAndSelect('category.templates', 'template')
        .loadRelationCountAndMap('category.template_count', 'category.templates');
    }

    query = query
      .orderBy(`category.${sort_by}`, sort_order)
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

  async findOne(id: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { id },
      relations: ['templates'],
    });
  }

  async findById(id: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { id },
      relations: ['templates'],
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { name },
    });
  }

  async update(id: string, updateData: Partial<Category>): Promise<Category | null> {
    const result = await this.categoryRepository.update(id, updateData);
    
    if (result.affected === 0) {
      return null;
    }
    
    return await this.findById(id);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.categoryRepository.delete(id);
    return (result.affected || 0) > 0;
  }

  async count(): Promise<number> {
    return await this.categoryRepository.count();
  }

  async findByType(type: 'photo' | 'video'): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { type },
      order: { created_at: 'DESC' },
    });
  }

  async findOrCreate(name: string, link?: string, type: 'photo' | 'video' = 'photo'): Promise<Category> {
    let category = await this.findByName(name);
    
    if (!category) {
      category = await this.create({
        name,
        link,
        type,
      });
    }
    
    return category;
  }

  async deleteAll(): Promise<void> {
    await this.categoryRepository.delete({});
  }
}