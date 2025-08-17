import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { TemplatesService } from './templates.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  QueryTemplateDto,
  TemplateResponseDto,
} from './dto';
import { StaticTokenAuth } from '@/modules/auth';

@ApiTags('Templates')
@Controller('templates')
@UsePipes(new ValidationPipe({ transform: true }))
export class TemplatesController {
  private readonly logger = new Logger(TemplatesController.name);

  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @StaticTokenAuth()
  @ApiOperation({ summary: 'Create a new template' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Template created successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<TemplateResponseDto> {
    this.logger.log(
      `Creating new template for category ID: ${createTemplateDto.category_id}`,
    );
    return await this.templatesService.create(createTemplateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all templates with pagination and filtering' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'category_name',
    required: false,
    description: 'Filter by category name',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['photo', 'video'],
    description: 'Filter by type',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in prompt text',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['created_at', 'updated_at', 'category_name'],
    description: 'Sort field',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort direction',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Templates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/TemplateResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async findAll(@Query() queryDto: QueryTemplateDto) {
    this.logger.log(
      `Retrieving templates with filters: ${JSON.stringify(queryDto)}`,
    );
    return await this.templatesService.findAll(queryDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get template statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        byType: { type: 'object', additionalProperties: { type: 'number' } },
        byCategory: {
          type: 'object',
          additionalProperties: { type: 'number' },
        },
      },
    },
  })
  async getStats() {
    this.logger.log('Retrieving template statistics');
    return await this.templatesService.getStats();
  }

  @Post('import-csv')
  @StaticTokenAuth()
  @ApiOperation({ summary: 'Import templates from CSV file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        filePath: { type: 'string', description: 'Path to CSV file' },
        forceType: {
          type: 'string',
          enum: ['photo', 'video'],
          default: 'photo',
          description: 'Force all imports to this type',
        },
      },
      required: ['filePath'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV import completed',
    schema: {
      type: 'object',
      properties: {
        imported: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
        skipped: { type: 'number' },
      },
    },
  })
  async importFromCsv(
    @Body() body: { filePath: string; forceType?: 'photo' | 'video' },
  ) {
    this.logger.log(`Starting CSV import from: ${body.filePath}`);
    return await this.templatesService.importFromCsv(
      body.filePath,
      body.forceType || 'photo',
    );
  }

  @Delete('clear')
  @StaticTokenAuth()
  @ApiOperation({ summary: 'Clear all templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All templates cleared successfully',
  })
  async clearAll() {
    this.logger.log('Clearing all templates');
    await this.templatesService.clearAllTemplates();
    return { message: 'All templates cleared successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiParam({ name: 'id', description: 'Template UUID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template retrieved successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TemplateResponseDto> {
    this.logger.log(`Retrieving template with ID: ${id}`);
    return await this.templatesService.findOne(id);
  }

  @Patch(':id')
  @StaticTokenAuth()
  @ApiOperation({ summary: 'Update template by ID' })
  @ApiParam({ name: 'id', description: 'Template UUID', type: 'string' })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template updated successfully',
    type: TemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<TemplateResponseDto> {
    this.logger.log(`Updating template with ID: ${id}`);
    return await this.templatesService.update(id, updateTemplateDto);
  }

  @Delete(':id')
  @StaticTokenAuth()
  @ApiOperation({ summary: 'Delete template by ID' })
  @ApiParam({ name: 'id', description: 'Template UUID', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Template not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Deleting template with ID: ${id}`);
    await this.templatesService.remove(id);
    return { message: 'Template deleted successfully' };
  }
}
