import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { AuthUserDto } from '@/modules/auth/dto';
import { GenerationsService } from '@/modules/generations';
import {
  CreateSessionDto,
  SessionResponseDto,
  QuerySessionDto,
  UpdateSessionDto,
  LatestGenerationDto,
} from './dto';
import { SessionsRepository, SessionWithStats } from './sessions.repository';
import { SessionType } from './enums';

export interface PaginatedSessionResponse {
  sessions: SessionResponseDto[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface UserSessionStatsResponse {
  total_sessions: number;
  active_sessions: number;
  total_generations: number;
  total_credits_spent: number;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly sessionsRepository: SessionsRepository,
    @Inject(forwardRef(() => GenerationsService))
    private readonly generationsService: GenerationsService,
  ) {}

  /**
   * Create a new session for the authenticated user
   */
  async create(
    createSessionDto: CreateSessionDto,
    authUser: AuthUserDto,
  ): Promise<SessionResponseDto> {
    this.logger.log(
      `Creating session '${createSessionDto.name}' for user: ${authUser.user_id}`,
    );

    // Validate session name is not empty after trim
    const trimmedName = createSessionDto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestException('Session name cannot be empty');
    }

    // Create session with trimmed name and default session type
    const sessionData = {
      ...createSessionDto,
      name: trimmedName,
      description: createSessionDto.description?.trim() || undefined,
      session_type: createSessionDto.session_type || SessionType.PHOTO,
    };

    try {
      const session = await this.sessionsRepository.create(
        authUser.user_id,
        sessionData,
      );

      this.logger.log(
        `Session created successfully with ID: ${session.id} for user: ${authUser.user_id}`,
      );

      const transformed = plainToInstance(SessionResponseDto, session, {
        excludeExtraneousValues: true,
      });

      // Handle latest_generation transformation (new sessions won't have any generations)
      if ((session as any).latest_generation) {
        transformed.latest_generation = plainToInstance(
          LatestGenerationDto,
          (session as any).latest_generation,
          {
            excludeExtraneousValues: true,
          },
        );
      }

      return transformed;
    } catch (error) {
      this.logger.error(
        `Failed to create session for user ${authUser.user_id}:`,
        error,
      );
      throw new BadRequestException('Failed to create session');
    }
  }

  /**
   * Get user's sessions with optional filtering and pagination
   */
  async getUserSessions(
    queryDto: QuerySessionDto,
    authUser: AuthUserDto,
    includeStats: boolean = false,
  ): Promise<PaginatedSessionResponse> {
    this.logger.log(
      `Fetching sessions for user: ${authUser.user_id} with stats: ${includeStats}`,
    );

    try {
      const { sessions, total } = await this.sessionsRepository.findByUser(
        authUser.user_id,
        queryDto,
        includeStats,
      );

      const sessionResponses = sessions.map((session: SessionWithStats) => {
        const transformed = plainToInstance(SessionResponseDto, session, {
          excludeExtraneousValues: true,
        });

        // Handle latest_generation transformation
        if (session.latest_generation) {
          transformed.latest_generation = plainToInstance(
            LatestGenerationDto,
            session.latest_generation,
            {
              excludeExtraneousValues: true,
            },
          );
        }

        return transformed;
      });

      const totalPages = Math.ceil(total / queryDto.limit);

      this.logger.log(
        `Found ${sessions.length} sessions for user: ${authUser.user_id}`,
      );

      return {
        sessions: sessionResponses,
        pagination: {
          current_page: queryDto.page,
          per_page: queryDto.limit,
          total,
          total_pages: totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch sessions for user ${authUser.user_id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch sessions');
    }
  }

  /**
   * Get a specific session by ID with statistics
   */
  async getSessionById(
    sessionId: number,
    authUser: AuthUserDto,
    includeStats: boolean = true,
  ): Promise<SessionResponseDto> {
    this.logger.log(
      `Fetching session ${sessionId} for user: ${authUser.user_id} with stats: ${includeStats}`,
    );

    if (sessionId <= 0) {
      throw new BadRequestException('Invalid session ID');
    }

    try {
      let session: SessionWithStats | null;

      if (includeStats) {
        session = await this.sessionsRepository.findByIdWithStats(
          sessionId,
          authUser.user_id,
        );
      } else {
        const basicSession = await this.sessionsRepository.findById(
          sessionId,
          authUser.user_id,
        );
        session = basicSession
          ? {
              ...basicSession,
              generation_count: 0,
              total_credits_spent: 0,
            }
          : null;
      }

      if (!session) {
        throw new NotFoundException(
          `Session with ID ${sessionId} not found or access denied`,
        );
      }

      this.logger.log(
        `Session ${sessionId} found for user: ${authUser.user_id}`,
      );

      const transformed = plainToInstance(SessionResponseDto, session, {
        excludeExtraneousValues: true,
      });

      // Handle latest_generation transformation
      if (session.latest_generation) {
        transformed.latest_generation = plainToInstance(
          LatestGenerationDto,
          session.latest_generation,
          {
            excludeExtraneousValues: true,
          },
        );
      }

      return transformed;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to fetch session ${sessionId} for user ${authUser.user_id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch session');
    }
  }

  /**
   * Update a session
   */
  async update(
    sessionId: number,
    updateSessionDto: UpdateSessionDto,
    authUser: AuthUserDto,
  ): Promise<SessionResponseDto> {
    this.logger.log(
      `Updating session ${sessionId} for user: ${authUser.user_id}`,
    );

    if (sessionId <= 0) {
      throw new BadRequestException('Invalid session ID');
    }

    // Validate at least one field is provided for update
    if (
      !updateSessionDto.name &&
      !updateSessionDto.description &&
      updateSessionDto.is_active === undefined &&
      !updateSessionDto.session_type
    ) {
      throw new BadRequestException(
        'At least one field must be provided for update',
      );
    }

    // Trim string fields if provided
    const updateData = { ...updateSessionDto };
    if (updateData.name) {
      updateData.name = updateData.name.trim();
      if (!updateData.name) {
        throw new BadRequestException('Session name cannot be empty');
      }
    }
    if (updateData.description) {
      updateData.description = updateData.description.trim() || undefined;
    }

    try {
      // Check if session exists and user owns it
      const existingSession = await this.sessionsRepository.findById(
        sessionId,
        authUser.user_id,
      );
      if (!existingSession) {
        throw new NotFoundException(
          `Session with ID ${sessionId} not found or access denied`,
        );
      }

      const updatedSession = await this.sessionsRepository.update(
        sessionId,
        authUser.user_id,
        updateData,
      );

      if (!updatedSession) {
        throw new BadRequestException('Failed to update session');
      }

      this.logger.log(
        `Session ${sessionId} updated successfully for user: ${authUser.user_id}`,
      );

      const transformed = plainToInstance(SessionResponseDto, updatedSession, {
        excludeExtraneousValues: true,
      });

      // Handle latest_generation transformation if updatedSession has it
      if ((updatedSession as any).latest_generation) {
        transformed.latest_generation = plainToInstance(
          LatestGenerationDto,
          (updatedSession as any).latest_generation,
          {
            excludeExtraneousValues: true,
          },
        );
      }

      return transformed;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to update session ${sessionId} for user ${authUser.user_id}:`,
        error,
      );
      throw new BadRequestException('Failed to update session');
    }
  }

  /**
   * Soft delete a session (set is_active to false)
   */
  async deactivate(sessionId: number, authUser: AuthUserDto): Promise<void> {
    this.logger.log(
      `Deactivating session ${sessionId} for user: ${authUser.user_id}`,
    );

    if (sessionId <= 0) {
      throw new BadRequestException('Invalid session ID');
    }

    try {
      // Check if session exists and user owns it
      const existingSession = await this.sessionsRepository.findById(
        sessionId,
        authUser.user_id,
      );
      if (!existingSession) {
        throw new NotFoundException(
          `Session with ID ${sessionId} not found or access denied`,
        );
      }

      if (!existingSession.is_active) {
        throw new BadRequestException('Session is already inactive');
      }

      const success = await this.sessionsRepository.softDelete(
        sessionId,
        authUser.user_id,
      );

      if (!success) {
        throw new BadRequestException('Failed to deactivate session');
      }

      // Also soft delete all related generations
      try {
        const deletedGenerationsCount =
          await this.generationsService.softDeleteGenerationsBySession(
            sessionId,
            authUser.user_id,
          );

        this.logger.log(
          `Session ${sessionId} deactivated successfully with ${deletedGenerationsCount} generations soft deleted for user: ${authUser.user_id}`,
        );
      } catch (generationError) {
        this.logger.error(
          `Session ${sessionId} was deactivated but failed to soft delete generations:`,
          generationError,
        );
        // Don't throw error as the session was successfully deactivated
        // The generations will be handled in a separate cleanup process if needed
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to deactivate session ${sessionId} for user ${authUser.user_id}:`,
        error,
      );
      throw new BadRequestException('Failed to deactivate session');
    }
  }

  /**
   * Hard delete a session (permanently remove from database)
   */
  async delete(sessionId: number, authUser: AuthUserDto): Promise<void> {
    this.logger.log(
      `Permanently deleting session ${sessionId} for user: ${authUser.user_id}`,
    );

    if (sessionId <= 0) {
      throw new BadRequestException('Invalid session ID');
    }

    try {
      // Check if session exists and user owns it
      const existingSession = await this.sessionsRepository.findById(
        sessionId,
        authUser.user_id,
      );
      if (!existingSession) {
        throw new NotFoundException(
          `Session with ID ${sessionId} not found or access denied`,
        );
      }

      // Perform hard delete with transaction to handle related generations
      const success = await this.sessionsRepository.hardDelete(
        sessionId,
        authUser.user_id,
      );

      if (!success) {
        throw new BadRequestException('Failed to delete session');
      }

      this.logger.log(
        `Session ${sessionId} permanently deleted for user: ${authUser.user_id}`,
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to delete session ${sessionId} for user ${authUser.user_id}:`,
        error,
      );
      throw new BadRequestException('Failed to delete session');
    }
  }

  /**
   * Get user's session statistics
   */
  async getUserSessionStats(
    authUser: AuthUserDto,
  ): Promise<UserSessionStatsResponse> {
    this.logger.log(
      `Fetching session statistics for user: ${authUser.user_id}`,
    );

    try {
      const stats = await this.sessionsRepository.getUserSessionStats(
        authUser.user_id,
      );

      this.logger.log(
        `Session statistics retrieved for user: ${authUser.user_id}`,
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to fetch session statistics for user ${authUser.user_id}:`,
        error,
      );
      throw new BadRequestException('Failed to fetch session statistics');
    }
  }

  /**
   * Validate session ownership (for use by other services)
   */
  async validateSessionOwnership(
    sessionId: number,
    userId: string,
  ): Promise<boolean> {
    try {
      return await this.sessionsRepository.isOwnedByUser(sessionId, userId);
    } catch (error) {
      this.logger.error(
        `Failed to validate session ownership for session ${sessionId} and user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get session for internal use (without auth validation)
   */
  async getSessionForService(
    sessionId: number,
  ): Promise<SessionWithStats | null> {
    try {
      return await this.sessionsRepository.findByIdWithStats(sessionId);
    } catch (error) {
      this.logger.error(
        `Failed to fetch session ${sessionId} for service:`,
        error,
      );
      return null;
    }
  }
}
