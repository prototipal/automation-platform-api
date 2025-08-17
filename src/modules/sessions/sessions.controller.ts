import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuthUser, HybridAuth } from '@/modules/auth/decorators';
import { AuthUserDto } from '@/modules/auth/dto';
import {
  CreateSessionDto,
  SessionResponseDto,
  QuerySessionDto,
  UpdateSessionDto,
} from './dto';
import {
  SessionsService,
  PaginatedSessionResponse,
  UserSessionStatsResponse,
} from './sessions.service';

@ApiTags('Sessions')
@Controller('sessions')
@HybridAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new session',
    description: 'Create a new session for organizing generations',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @AuthUser() authUser: AuthUserDto,
  ): Promise<SessionResponseDto> {
    console.log('auth-user', authUser);
    return await this.sessionsService.create(createSessionDto, authUser);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user sessions',
    description:
      "Retrieve user's sessions with optional filtering, pagination, and statistics",
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Filter by session status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search sessions by name (partial match)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['created_at', 'updated_at', 'name'],
    description: 'Sort by field (default: created_at)',
  })
  @ApiQuery({
    name: 'sort_order',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (default: DESC)',
  })
  @ApiQuery({
    name: 'include_stats',
    required: false,
    type: Boolean,
    description: 'Include generation statistics (default: false)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          items: { $ref: '#/components/schemas/SessionResponseDto' },
        },
        pagination: {
          type: 'object',
          properties: {
            current_page: { type: 'number' },
            per_page: { type: 'number' },
            total: { type: 'number' },
            total_pages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  async getUserSessions(
    @Query() queryDto: QuerySessionDto,
    @Query('include_stats') includeStats: boolean = false,
    @AuthUser() authUser: AuthUserDto,
  ): Promise<PaginatedSessionResponse> {
    return await this.sessionsService.getUserSessions(
      queryDto,
      authUser,
      includeStats,
    );
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get user session statistics',
    description:
      "Retrieve comprehensive statistics about user's sessions and generations",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total_sessions: { type: 'number' },
        active_sessions: { type: 'number' },
        total_generations: { type: 'number' },
        total_credits_spent: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  async getUserSessionStats(
    @AuthUser() authUser: AuthUserDto,
  ): Promise<UserSessionStatsResponse> {
    return await this.sessionsService.getUserSessionStats(authUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get session by ID',
    description:
      'Retrieve a specific session with optional generation statistics',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Session ID',
  })
  @ApiQuery({
    name: 'include_stats',
    required: false,
    type: Boolean,
    description: 'Include generation statistics (default: true)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session retrieved successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found or access denied',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid session ID',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  async getSessionById(
    @Param('id', ParseIntPipe) sessionId: number,
    @Query('include_stats') includeStats: boolean = true,
    @AuthUser() authUser: AuthUserDto,
  ): Promise<SessionResponseDto> {
    return await this.sessionsService.getSessionById(
      sessionId,
      authUser,
      includeStats,
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update session',
    description: 'Update session name, description, or status',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Session ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session updated successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found or access denied',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or session ID',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  async updateSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @Body() updateSessionDto: UpdateSessionDto,
    @AuthUser() authUser: AuthUserDto,
  ): Promise<SessionResponseDto> {
    return await this.sessionsService.update(
      sessionId,
      updateSessionDto,
      authUser,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deactivate session',
    description: 'Soft delete a session by setting is_active to false',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Session ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Session deactivated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found or access denied',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid session ID or session already inactive',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  async deactivateSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @AuthUser() authUser: AuthUserDto,
  ): Promise<void> {
    return await this.sessionsService.deactivate(sessionId, authUser);
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Permanently delete session',
    description:
      'Hard delete a session by permanently removing it from the database. Associated generations will be unlinked but preserved.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Session ID',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Session permanently deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found or access denied',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid session ID',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing API key',
  })
  async deleteSession(
    @Param('id', ParseIntPipe) sessionId: number,
    @AuthUser() authUser: AuthUserDto,
  ): Promise<void> {
    return await this.sessionsService.delete(sessionId, authUser);
  }
}
