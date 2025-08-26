import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { PackagesService } from './packages.service';
import {
  CreatePackageDto,
  UpdatePackageDto,
  QueryPackageDto,
  PackageResponseDto,
  UserPackageResponseDto,
} from '@/modules/packages/dto';
import { PackageType } from '@/modules/packages/enums';
import { HybridAuthGuard } from '@/modules/auth/guards';
import { AuthUser, HybridAuth } from '@/modules/auth/decorators';
import { AuthUserDto } from '@/modules/auth/dto';

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new package',
    description: 'Create a new subscription package with pricing and features. Admin access required.'
  })
  @ApiResponse({
    status: 201,
    description: 'Package created successfully',
    type: PackageResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Package with this type already exists',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async createPackage(@Body() createPackageDto: CreatePackageDto): Promise<PackageResponseDto> {
    return this.packagesService.createPackage(createPackageDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all packages',
    description: 'Retrieve all subscription packages with optional filtering'
  })
  @ApiResponse({
    status: 200,
    description: 'Packages retrieved successfully',
    type: [PackageResponseDto],
  })
  @ApiQuery({ name: 'type', required: false, enum: PackageType })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'is_default', required: false, type: Boolean })
  async findAllPackages(@Query() query: QueryPackageDto): Promise<PackageResponseDto[]> {
    return this.packagesService.findAllPackages(query);
  }

  @Get('active')
  @ApiOperation({ 
    summary: 'Get all active packages',
    description: 'Retrieve only active packages available for subscription'
  })
  @ApiResponse({
    status: 200,
    description: 'Active packages retrieved successfully',
    type: [PackageResponseDto],
  })
  async findActivePackages(): Promise<PackageResponseDto[]> {
    return this.packagesService.findAllPackages({ is_active: true });
  }

  @Get('my-subscription')
  @ApiOperation({ 
    summary: 'Get current user subscription',
    description: 'Get the current user\'s active package subscription'
  })
  @ApiResponse({
    status: 200,
    description: 'User subscription retrieved successfully',
    type: UserPackageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async getCurrentUserPackage(@AuthUser() user: AuthUserDto): Promise<UserPackageResponseDto | null> {
    return this.packagesService.getUserCurrentPackage(user.user_id);
  }

  @Get('my-history')
  @ApiOperation({ 
    summary: 'Get user subscription history',
    description: 'Get the current user\'s complete package subscription history'
  })
  @ApiResponse({
    status: 200,
    description: 'User subscription history retrieved successfully',
    type: [UserPackageResponseDto],
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async getUserPackageHistory(@AuthUser() user: AuthUserDto): Promise<UserPackageResponseDto[]> {
    return this.packagesService.getUserPackageHistory(user.user_id);
  }

  @Get('my-limits')
  @ApiOperation({ 
    summary: 'Check current user package limits',
    description: 'Check if the current user can generate content based on their package limits'
  })
  @ApiResponse({
    status: 200,
    description: 'Package limits retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        canGenerate: { type: 'boolean', description: 'Whether user can generate content' },
        reason: { type: 'string', description: 'Reason if cannot generate', nullable: true },
        creditsRemaining: { type: 'number', description: 'Credits remaining in current period' },
        generationsRemaining: { type: 'number', description: 'Generations remaining in current period (-1 if unlimited)' },
        packageCredits: { type: 'number', description: 'Total monthly credits included in user\'s package' },
      },
    },
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async checkPackageLimits(@AuthUser() user: AuthUserDto) {
    return this.packagesService.checkPackageLimits(user.user_id);
  }

  @Get('type/:type')
  @ApiOperation({ 
    summary: 'Get package by type',
    description: 'Retrieve a specific package by its type'
  })
  @ApiParam({ name: 'type', enum: PackageType, description: 'Package type' })
  @ApiResponse({
    status: 200,
    description: 'Package retrieved successfully',
    type: PackageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Package not found',
  })
  async findPackageByType(@Param('type') type: PackageType): Promise<PackageResponseDto> {
    return this.packagesService.findPackageByType(type);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get package by ID',
    description: 'Retrieve a specific package by its ID'
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Package ID' })
  @ApiResponse({
    status: 200,
    description: 'Package retrieved successfully',
    type: PackageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Package not found',
  })
  async findPackageById(@Param('id', ParseIntPipe) id: number): Promise<PackageResponseDto> {
    return this.packagesService.findPackageById(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update package',
    description: 'Update an existing package. Admin access required.'
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Package ID' })
  @ApiResponse({
    status: 200,
    description: 'Package updated successfully',
    type: PackageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Package not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Package type conflict',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async updatePackage(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePackageDto: UpdatePackageDto,
  ): Promise<PackageResponseDto> {
    return this.packagesService.updatePackage(id, updatePackageDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete package',
    description: 'Soft delete a package (sets is_active to false). Admin access required.'
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Package ID' })
  @ApiResponse({
    status: 204,
    description: 'Package deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Package not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete package with active subscriptions',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async deletePackage(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.packagesService.deletePackage(id);
  }
}