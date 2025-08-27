import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { Category, MainCategory } from './entities';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  QueryCategoryDto,
  CategoryResponseDto,
  MainCategoryResponseDto,
  SubCategoryResponseDto,
} from './dto';
import { CategoriesRepository, PaginatedResult } from './categories.repository';
import { TemplatePreviewDto } from '../templates/dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    try {
      // Check if category with same name already exists
      const existingCategory = await this.categoriesRepository.findByName(
        createCategoryDto.name,
      );
      if (existingCategory) {
        throw new ConflictException(
          `Category with name '${createCategoryDto.name}' already exists`,
        );
      }

      const category =
        await this.categoriesRepository.create(createCategoryDto);
      return plainToInstance(CategoryResponseDto, category);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(
        `Failed to create category: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to create category');
    }
  }

  async findAll(
    queryDto: QueryCategoryDto,
  ): Promise<PaginatedResult<CategoryResponseDto>> {
    const result = await this.categoriesRepository.findAll(queryDto);

    return {
      ...result,
      data: result.data.map((category) => {
        const responseDto = plainToInstance(CategoryResponseDto, category);
        // Add template count if it was requested and available
        if (queryDto.include_template_count && 'template_count' in category) {
          responseDto.template_count = (category as any).template_count;
        }
        return responseDto;
      }),
    };
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const responseDto = plainToInstance(CategoryResponseDto, category);
    // Include template count
    responseDto.template_count = category.templates?.length || 0;
    return responseDto;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const existingCategory = await this.categoriesRepository.findById(id);

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if trying to update name to an existing name
    if (
      updateCategoryDto.name &&
      updateCategoryDto.name !== existingCategory.name
    ) {
      const categoryWithName = await this.categoriesRepository.findByName(
        updateCategoryDto.name,
      );
      if (categoryWithName) {
        throw new ConflictException(
          `Category with name '${updateCategoryDto.name}' already exists`,
        );
      }
    }

    try {
      const updatedCategory = await this.categoriesRepository.update(
        id,
        updateCategoryDto,
      );
      return plainToInstance(CategoryResponseDto, updatedCategory);
    } catch (error) {
      this.logger.error(
        `Failed to update category ${id}: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to update category');
    }
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    // Check if category has templates
    if (category.templates && category.templates.length > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${category.templates.length} associated templates. Please reassign or delete the templates first.`,
      );
    }

    const deleted = await this.categoriesRepository.remove(id);

    if (!deleted) {
      throw new BadRequestException('Failed to delete category');
    }
  }

  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    withTemplates: number;
  }> {
    const total = await this.categoriesRepository.count();

    const allCategories = await this.categoriesRepository.findAll({
      include_template_count: true,
    });

    const byType = allCategories.data.reduce(
      (acc, category) => {
        acc[category.type] = (acc[category.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const withTemplates = allCategories.data.filter(
      (category) => (category as any).template_count > 0,
    ).length;

    return { total, byType, withTemplates };
  }

  async findOrCreate(
    name: string,
    link?: string,
    type: 'photo' | 'video' = 'photo',
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesRepository.findOrCreate(
      name,
      link,
      type,
    );
    return plainToInstance(CategoryResponseDto, category);
  }

  async clearAllCategories(): Promise<void> {
    this.logger.log('Clearing all categories...');
    await this.categoriesRepository.deleteAll();
    this.logger.log('All categories cleared');
  }

  async findAllNested(
    queryDto: QueryCategoryDto,
  ): Promise<PaginatedResult<MainCategoryResponseDto>> {
    const result =
      await this.categoriesRepository.findSubCategoriesPaginated(queryDto);

    // Group sub-categories by main category
    const mainCategoriesGrouped = new Map<
      string,
      { mainCategory: MainCategory; subCategories: Category[] }
    >();

    result.data.forEach((category) => {
      if (!category.mainCategory) {
        return; // Skip categories without main category
      }

      const mainCategoryId = category.mainCategory.id;
      if (!mainCategoriesGrouped.has(mainCategoryId)) {
        mainCategoriesGrouped.set(mainCategoryId, {
          mainCategory: category.mainCategory,
          subCategories: [],
        });
      }

      mainCategoriesGrouped.get(mainCategoryId).subCategories.push(category);
    });

    // Transform to response DTOs
    const transformedData = Array.from(mainCategoriesGrouped.values()).map(
      ({ mainCategory, subCategories }) => {
        const mainCategoryDto = plainToInstance(
          MainCategoryResponseDto,
          mainCategory,
        );

        // Transform sub-categories
        mainCategoryDto.subCategories = subCategories.map((category) => {
          const subCategoryDto = plainToInstance(
            SubCategoryResponseDto,
            category,
          );

          // Add template count if it was requested and available
          if (queryDto.include_template_count && 'template_count' in category) {
            subCategoryDto.template_count = (category as any).template_count;
          }

          // Add latest template if available
          if ((category as any).latestTemplate) {
            subCategoryDto.latestTemplate = plainToInstance(
              TemplatePreviewDto,
              (category as any).latestTemplate,
            );
          }

          return subCategoryDto;
        });

        return mainCategoryDto;
      },
    );

    return {
      data: transformedData,
      total: result.total, // This is now the total count of sub-categories
      ...(result.page && { page: result.page }),
      ...(result.limit && { limit: result.limit }),
      ...(result.totalPages && { totalPages: result.totalPages }),
    };
  }

  async findMainCategoryByName(name: string): Promise<MainCategory | null> {
    return await this.categoriesRepository.findMainCategoryByName(name);
  }

  async findOrCreateWithMainCategory(
    name: string,
    mainCategoryId: string,
    link?: string,
    type: 'photo' | 'video' = 'photo',
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesRepository.findOrCreateWithMainCategory(
      name,
      mainCategoryId,
      link,
      type,
    );
    return plainToInstance(CategoryResponseDto, category);
  }

  async findOneMainCategory(
    id: string,
    includeTemplateCount: boolean = true,
  ): Promise<MainCategoryResponseDto> {
    const mainCategory = await this.categoriesRepository.findMainCategoryById(
      id,
      includeTemplateCount,
    );

    if (!mainCategory) {
      throw new NotFoundException(`Main category with ID ${id} not found`);
    }

    const mainCategoryDto = plainToInstance(
      MainCategoryResponseDto,
      mainCategory,
    );

    // Transform sub-categories
    mainCategoryDto.subCategories = (mainCategory.categories || []).map(
      (category) => {
        const subCategoryDto = plainToInstance(
          SubCategoryResponseDto,
          category,
        );

        // Add template count if available
        if (includeTemplateCount && 'template_count' in category) {
          subCategoryDto.template_count = (category as any).template_count;
        } else if (category.templates) {
          subCategoryDto.template_count = category.templates.length;
        }

        // Add latest template if available
        if ((category as any).latestTemplate) {
          subCategoryDto.latestTemplate = plainToInstance(
            TemplatePreviewDto,
            (category as any).latestTemplate,
          );
        }

        return subCategoryDto;
      },
    );

    return mainCategoryDto;
  }
}
