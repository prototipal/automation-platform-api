import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';

import { Category, MainCategory } from './entities';
import { CreateCategoryDto, QueryCategoryDto } from './dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(MainCategory)
    private readonly mainCategoryRepository: Repository<MainCategory>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create({
      ...createCategoryDto,
      type: createCategoryDto.type || 'photo',
    });

    return await this.categoryRepository.save(category);
  }

  async createMany(
    createCategoryDtos: CreateCategoryDto[],
  ): Promise<Category[]> {
    const categories = this.categoryRepository.create(
      createCategoryDtos.map((dto) => ({
        ...dto,
        type: dto.type || 'photo',
      })),
    );

    return await this.categoryRepository.save(categories);
  }

  async findAll(
    queryDto: QueryCategoryDto,
  ): Promise<PaginatedResult<Category>> {
    const {
      page,
      limit,
      name,
      type,
      sort_by = 'created_at',
      sort_order = 'DESC',
      include_template_count = false,
    } = queryDto;

    // Check if pagination is requested
    const isPaginated = page !== undefined && page !== null;
    const pageSize = limit || 10;
    const skip = isPaginated ? (page - 1) * pageSize : 0;

    let query = this.categoryRepository.createQueryBuilder('category');

    if (name) {
      query = query.andWhere('category.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    if (type) {
      query = query.andWhere('category.type = :type', { type });
    }

    if (include_template_count) {
      query = query.loadRelationCountAndMap(
        'category.template_count',
        'category.templates',
      );
    }

    query = query.orderBy(`category.${sort_by}`, sort_order);

    // Apply pagination only if requested
    if (isPaginated) {
      query = query.skip(skip).take(pageSize);
    }

    const [data, total] = await query.getManyAndCount();

    const result: PaginatedResult<Category> = {
      data,
      total,
    };

    // Add pagination info only if pagination was requested
    if (isPaginated) {
      result.page = page;
      result.limit = pageSize;
      result.totalPages = Math.ceil(total / pageSize);
    }

    return result;
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

  async update(
    id: string,
    updateData: Partial<Category>,
  ): Promise<Category | null> {
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

  async findOrCreate(
    name: string,
    link?: string,
    type: 'photo' | 'video' = 'photo',
  ): Promise<Category> {
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

  async findMainCategoriesWithSubCategories(
    queryDto: QueryCategoryDto,
  ): Promise<PaginatedResult<MainCategory>> {
    const {
      page,
      limit,
      type,
      sort_by = 'created_at',
      sort_order = 'DESC',
      include_template_count = false,
    } = queryDto;

    // Check if pagination is requested
    const isPaginated = page !== undefined && page !== null;
    const pageSize = limit || 10;
    const skip = isPaginated ? (page - 1) * pageSize : 0;

    let query = this.mainCategoryRepository
      .createQueryBuilder('mainCategory')
      .leftJoinAndSelect('mainCategory.categories', 'category')
      .leftJoinAndSelect(
        'category.templates',
        'latestTemplate',
        'latestTemplate.id = (SELECT t.id FROM templates t WHERE t.category_id = category.id ORDER BY t.created_at DESC LIMIT 1)',
      );

    if (type) {
      query = query.andWhere('mainCategory.type = :type', { type });
    }

    if (include_template_count) {
      query = query.loadRelationCountAndMap(
        'category.template_count',
        'category.templates',
      );
    }

    query = query
      .orderBy(`mainCategory.${sort_by}`, sort_order)
      .addOrderBy('category.created_at', 'DESC');

    // Apply pagination only if requested
    if (isPaginated) {
      query = query.skip(skip).take(pageSize);
    }

    const [data, total] = await query.getManyAndCount();

    // Transform the data to properly structure the latest template
    const transformedData = data.map((mainCategory) => ({
      ...mainCategory,
      categories: mainCategory.categories.map((category) => ({
        ...category,
        latestTemplate:
          category.templates && category.templates.length > 0
            ? category.templates[0]
            : null,
        templates: category.templates,
      })),
    }));

    const result: PaginatedResult<MainCategory> = {
      data: transformedData,
      total,
    };

    // Add pagination info only if pagination was requested
    if (isPaginated) {
      result.page = page;
      result.limit = pageSize;
      result.totalPages = Math.ceil(total / pageSize);
    }

    return result;
  }

  async findMainCategoryById(
    id: string,
    includeTemplateCount: boolean = false,
  ): Promise<MainCategory | null> {
    let query = this.mainCategoryRepository
      .createQueryBuilder('mainCategory')
      .leftJoinAndSelect('mainCategory.categories', 'category')
      .leftJoinAndSelect(
        'category.templates',
        'latestTemplate',
        'latestTemplate.id = (SELECT t.id FROM templates t WHERE t.category_id = category.id ORDER BY t.created_at DESC LIMIT 1)',
      )
      .where('mainCategory.id = :id', { id });

    if (includeTemplateCount) {
      query = query.loadRelationCountAndMap(
        'category.template_count',
        'category.templates',
      );
    }

    const mainCategory = await query.getOne();

    if (!mainCategory) {
      return null;
    }

    // Transform the data to properly structure the latest template
    return {
      ...mainCategory,
      categories: mainCategory.categories.map((category) => ({
        ...category,
        latestTemplate:
          category.templates && category.templates.length > 0
            ? category.templates[0]
            : null,
        templates: category.templates,
      })),
    };
  }

  async findMainCategoryByName(name: string): Promise<MainCategory | null> {
    return await this.mainCategoryRepository.findOne({
      where: { name },
    });
  }

  async findOrCreateWithMainCategory(
    name: string,
    mainCategoryId: string,
    link?: string,
    type: 'photo' | 'video' = 'photo',
  ): Promise<Category> {
    let category = await this.findByName(name);

    if (!category) {
      category = await this.create({
        name,
        link,
        type,
        mainCategoryId,
      });
    }

    return category;
  }

  async findSubCategoriesPaginated(
    queryDto: QueryCategoryDto,
  ): Promise<
    PaginatedResult<Category> & { mainCategoriesMap: Map<string, MainCategory> }
  > {
    const {
      page,
      limit,
      type,
      name,
      main_category_id,
      sort_by = 'created_at',
      sort_order = 'DESC',
      include_template_count = false,
    } = queryDto;

    // Check if pagination is requested
    const isPaginated = page !== undefined && page !== null;
    const pageSize = limit || 10;
    const skip = isPaginated ? (page - 1) * pageSize : 0;

    // Build query for sub-categories with their main categories
    let query = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.mainCategory', 'mainCategory')
      .leftJoinAndSelect(
        'category.templates',
        'latestTemplate',
        'latestTemplate.id = (SELECT t.id FROM templates t WHERE t.category_id = category.id ORDER BY t.created_at DESC LIMIT 1)',
      );

    // Apply filters
    if (name) {
      query = query.andWhere('category.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    if (type) {
      query = query.andWhere('category.type = :type', { type });
    }

    if (main_category_id) {
      query = query.andWhere('category.main_category_id = :main_category_id', {
        main_category_id,
      });
    }

    // Include template count if requested
    if (include_template_count) {
      query = query.loadRelationCountAndMap(
        'category.template_count',
        'category.templates',
      );
    }

    // Apply sorting
    query = query.orderBy(`category.${sort_by}`, sort_order);

    // Apply pagination only if requested
    if (isPaginated) {
      query = query.skip(skip).take(pageSize);
    }

    const [data, total] = await query.getManyAndCount();

    // Create a map of main categories for efficient grouping
    const mainCategoriesMap = new Map<string, MainCategory>();
    data.forEach((category) => {
      if (
        category.mainCategory &&
        !mainCategoriesMap.has(category.mainCategory.id)
      ) {
        mainCategoriesMap.set(category.mainCategory.id, category.mainCategory);
      }
    });

    // Transform categories to include latest template properly
    const transformedData = data.map((category) => ({
      ...category,
      latestTemplate:
        category.templates && category.templates.length > 0
          ? category.templates[0]
          : null,
      templates: category.templates,
    }));

    const result = {
      data: transformedData,
      total,
      mainCategoriesMap,
      ...(isPaginated && {
        page,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      }),
    };

    return result;
  }
}
