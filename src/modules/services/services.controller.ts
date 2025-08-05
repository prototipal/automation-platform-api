import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { ServicesService, PaginatedResponse } from './services.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceResponseDto,
  QueryServiceDto,
} from './dto';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new service',
    description:
      'Creates a new AI service configuration with model specifications and field definitions',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Service created successfully',
    type: ServiceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or field validation failed',
  })
  @ApiConflictResponse({
    description: 'Service with the same model and version already exists',
  })
  async create(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    createServiceDto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    return await this.servicesService.create(createServiceDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all services',
    description:
      'Retrieves a paginated list of all AI services with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Services retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ServiceResponseDto' },
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 50 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['image-to-video', 'text-to-image'],
    description: 'Filter by service type',
  })
  @ApiQuery({
    name: 'model',
    required: false,
    enum: [
      'google',
      'kwaigi',
      'minimax',
      'bytedance',
      'wan-video',
      'wavespeedai',
    ],
    description: 'Filter by model',
  })
  @ApiQuery({
    name: 'model_version',
    required: false,
    enum: [
      'hailuo-02',
      'veo-3-fast',
      'seedance-1-pro',
      'veo-3',
      'video-01',
      'kling-v2.1',
    ],
    description: 'Filter by model version',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Filter by service provider',
  })
  async findAll(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    queryDto: QueryServiceDto,
  ): Promise<PaginatedResponse<ServiceResponseDto>> {
    return await this.servicesService.findAll(queryDto);
  }

  @Get('model/:model')
  @ApiOperation({
    summary: 'Get services by model',
    description: 'Retrieves all services for a specific AI model provider',
  })
  @ApiParam({
    name: 'model',
    description: 'AI model provider name',
    enum: [
      'google',
      'kwaigi',
      'minimax',
      'bytedance',
      'wan-video',
      'wavespeedai',
    ],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Services retrieved successfully',
    type: [ServiceResponseDto],
  })
  async findByModel(
    @Param('model') model: string,
  ): Promise<ServiceResponseDto[]> {
    return await this.servicesService.findByModel(model);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get service by ID',
    description: 'Retrieves a specific AI service by its unique identifier',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the service',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service retrieved successfully',
    type: ServiceResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Service not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceResponseDto> {
    return await this.servicesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update service',
    description: 'Updates an existing AI service configuration',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the service',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service updated successfully',
    type: ServiceResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Service not found',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or field validation failed',
  })
  @ApiConflictResponse({
    description: 'Conflict with existing service configuration',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    updateServiceDto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return await this.servicesService.update(id, updateServiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete service',
    description: 'Removes an AI service configuration from the system',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the service',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Service deleted successfully',
  })
  @ApiNotFoundResponse({
    description: 'Service not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return await this.servicesService.remove(id);
  }
}
