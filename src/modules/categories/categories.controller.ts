import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto, QueryCategoryDto, CategoryResponseDto } from './dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new category',
    description: 'Creates a new category with the provided details. Category names must be unique.' 
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - category name already exists',
  })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all categories',
    description: 'Retrieves categories with optional filtering, sorting and pagination. If page parameter is not provided, all results are returned without pagination.' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination. If not provided, all results are returned' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, only applies with page parameter)' })
  @ApiQuery({ name: 'name', required: false, type: String, description: 'Filter by category name (partial match)' })
  @ApiQuery({ name: 'type', required: false, enum: ['photo', 'video'], description: 'Filter by category type' })
  @ApiQuery({ name: 'sort_by', required: false, type: String, description: 'Sort by field (default: created_at)' })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' })
  @ApiQuery({ name: 'include_template_count', required: false, type: Boolean, description: 'Include template count in response' })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/CategoryResponseDto' },
        },
        total: { type: 'number', description: 'Total number of categories' },
        page: { type: 'number', description: 'Current page (only present when paginated)' },
        limit: { type: 'number', description: 'Items per page (only present when paginated)' },
        totalPages: { type: 'number', description: 'Total number of pages (only present when paginated)' },
      },
    },
  })
  async findAll(@Query() queryDto: QueryCategoryDto) {
    return this.categoriesService.findAll(queryDto);
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get category statistics',
    description: 'Returns statistics about categories including totals by type and template usage.' 
  })
  @ApiResponse({
    status: 200,
    description: 'Category statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total number of categories' },
        byType: { 
          type: 'object', 
          additionalProperties: { type: 'number' },
          description: 'Count of categories by type' 
        },
        withTemplates: { type: 'number', description: 'Number of categories that have templates' },
      },
    },
  })
  async getStats() {
    return this.categoriesService.getStats();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get category by ID',
    description: 'Retrieves a single category by its ID, including template count.' 
  })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update category',
    description: 'Updates an existing category. Category names must remain unique.' 
  })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - category name already exists',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete category',
    description: 'Deletes a category. Cannot delete categories that have associated templates.' 
  })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({
    status: 204,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - category has associated templates',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}