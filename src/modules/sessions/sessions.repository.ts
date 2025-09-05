import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Session } from './entities/session.entity';
import { CreateSessionDto, QuerySessionDto, UpdateSessionDto } from './dto';

export interface SessionWithStats {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  session_type: string;
  created_at: Date;
  updated_at: Date;
  generation_count?: number;
  total_credits_spent?: number;
  latest_generation?: {
    id: number;
    name?: string;
    image_url?: string;
    created_at: Date;
    status: 'pending' | 'starting' | 'processing' | 'completed' | 'failed';
  };
}

@Injectable()
export class SessionsRepository {
  private readonly logger = new Logger(SessionsRepository.name);

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Create a new session
   */
  async create(
    userId: string,
    createSessionDto: CreateSessionDto,
  ): Promise<Session> {
    const session = this.sessionRepository.create({
      user_id: userId,
      ...createSessionDto,
    });

    return await this.sessionRepository.save(session);
  }

  /**
   * Find a session by ID with optional user validation
   */
  async findById(sessionId: number, userId?: string): Promise<Session | null> {
    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.id = :sessionId', { sessionId });

    if (userId) {
      queryBuilder.andWhere('session.user_id = :userId', { userId });
    }

    return await queryBuilder.getOne();
  }

  /**
   * Find a session by ID with generation statistics
   */
  async findByIdWithStats(
    sessionId: number,
    userId?: string,
  ): Promise<SessionWithStats | null> {
    let query = `
      SELECT 
        s.id,
        s.user_id,
        s.name,
        s.description,
        s.is_active,
        s.session_type,
        s.created_at,
        s.updated_at,
        COALESCE(g.generation_count, 0) as generation_count,
        COALESCE(g.total_credits_spent, 0) as total_credits_spent,
        lg.id as latest_generation_id,
        lg.name as latest_generation_name,
        lg.image_url as latest_generation_image_url,
        lg.created_at as latest_generation_created_at,
        lg.status as latest_generation_status
      FROM sessions s
      LEFT JOIN (
        SELECT 
          session_id,
          COUNT(*) as generation_count,
          SUM(credits_used) as total_credits_spent
        FROM generations
        WHERE session_id IS NOT NULL AND is_active = true
        GROUP BY session_id
      ) g ON s.id = g.session_id
      LEFT JOIN (
        SELECT DISTINCT ON (session_id)
          session_id,
          id,
          COALESCE(
            input_parameters->>'prompt',
            input_parameters->>'name',
            'Generation #' || id
          ) as name,
          CASE 
            WHEN supabase_urls IS NOT NULL AND jsonb_array_length(supabase_urls) > 0 
            THEN supabase_urls->>0 
            ELSE NULL 
          END as image_url,
          created_at,
          status
        FROM generations
        WHERE session_id IS NOT NULL AND is_active = true
        ORDER BY session_id, created_at DESC
      ) lg ON s.id = lg.session_id
      WHERE s.id = $1
    `;

    const params: any[] = [sessionId];

    if (userId) {
      query += ' AND s.user_id = $2';
      params.push(userId);
    }

    const result = await this.sessionRepository.manager.query(query, params);

    if (result.length === 0) {
      return null;
    }

    const session = result[0];
    const processedResult: any = {
      ...session,
      generation_count: parseInt(session.generation_count) || 0,
      total_credits_spent: parseFloat(session.total_credits_spent) || 0,
    };

    // Add latest_generation if exists
    if (session.latest_generation_id) {
      processedResult.latest_generation = {
        id: parseInt(session.latest_generation_id),
        name: session.latest_generation_name,
        image_url: session.latest_generation_image_url,
        created_at: new Date(session.latest_generation_created_at),
        status: session.latest_generation_status,
      };
    }

    // Remove the flattened latest_generation fields
    delete processedResult.latest_generation_id;
    delete processedResult.latest_generation_name;
    delete processedResult.latest_generation_image_url;
    delete processedResult.latest_generation_created_at;
    delete processedResult.latest_generation_status;

    return processedResult;
  }

  /**
   * Find sessions by user with optional filtering and statistics
   */
  async findByUser(
    userId: string,
    queryDto: QuerySessionDto,
    includeStats: boolean = false,
  ): Promise<{ sessions: SessionWithStats[]; total: number }> {
    const {
      is_active,
      search,
      session_type,
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = queryDto;

    let query: string;
    let countQuery: string;
    const params: any[] = [userId];
    let paramIndex = 1;

    if (includeStats) {
      query = `
        SELECT 
          s.id,
          s.user_id,
          s.name,
          s.description,
          s.is_active,
          s.session_type,
          s.created_at,
          s.updated_at,
          COALESCE(g.generation_count, 0) as generation_count,
          COALESCE(g.total_credits_spent, 0) as total_credits_spent,
          lg.id as latest_generation_id,
          lg.name as latest_generation_name,
          lg.image_url as latest_generation_image_url,
          lg.created_at as latest_generation_created_at,
          lg.status as latest_generation_status
        FROM sessions s
        LEFT JOIN (
          SELECT 
            session_id,
            COUNT(*) as generation_count,
            SUM(credits_used) as total_credits_spent
          FROM generations
          WHERE session_id IS NOT NULL
          GROUP BY session_id
        ) g ON s.id = g.session_id
        LEFT JOIN (
          SELECT DISTINCT ON (session_id)
            session_id,
            id,
            COALESCE(
              input_parameters->>'prompt',
              input_parameters->>'name',
              'Generation #' || id
            ) as name,
            CASE 
              WHEN supabase_urls IS NOT NULL AND jsonb_array_length(supabase_urls) > 0 
              THEN supabase_urls->>0 
              ELSE NULL 
            END as image_url,
            created_at,
            status
          FROM generations
          WHERE session_id IS NOT NULL
          ORDER BY session_id, created_at DESC
        ) lg ON s.id = lg.session_id
        WHERE s.user_id = $1
      `;

      countQuery = `
        SELECT COUNT(*) as total
        FROM sessions s
        WHERE s.user_id = $1
      `;
    } else {
      query = `
        SELECT 
          s.id,
          s.user_id,
          s.name,
          s.description,
          s.is_active,
          s.session_type,
          s.created_at,
          s.updated_at,
          lg.id as latest_generation_id,
          lg.name as latest_generation_name,
          lg.image_url as latest_generation_image_url,
          lg.created_at as latest_generation_created_at,
          lg.status as latest_generation_status
        FROM sessions s
        LEFT JOIN (
          SELECT DISTINCT ON (session_id)
            session_id,
            id,
            COALESCE(
              input_parameters->>'prompt',
              input_parameters->>'name',
              'Generation #' || id
            ) as name,
            CASE 
              WHEN supabase_urls IS NOT NULL AND jsonb_array_length(supabase_urls) > 0 
              THEN supabase_urls->>0 
              ELSE NULL 
            END as image_url,
            created_at,
            status
          FROM generations
          WHERE session_id IS NOT NULL
          ORDER BY session_id, created_at DESC
        ) lg ON s.id = lg.session_id
        WHERE s.user_id = $1
      `;

      countQuery = `
        SELECT COUNT(*) as total
        FROM sessions s
        WHERE s.user_id = $1
      `;
    }

    // Add filters - default to active sessions only
    if (is_active !== undefined) {
      paramIndex++;
      query += ` AND s.is_active = $${paramIndex}`;
      countQuery += ` AND s.is_active = $${paramIndex}`;
      params.push(is_active);
    } else {
      // Default to active sessions only when is_active is not specified
      paramIndex++;
      query += ` AND s.is_active = $${paramIndex}`;
      countQuery += ` AND s.is_active = $${paramIndex}`;
      params.push(true);
    }

    if (search) {
      paramIndex++;
      query += ` AND s.name ILIKE $${paramIndex}`;
      countQuery += ` AND s.name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
    }

    if (session_type) {
      paramIndex++;
      query += ` AND s.session_type = $${paramIndex}`;
      countQuery += ` AND s.session_type = $${paramIndex}`;
      params.push(session_type);
    }

    // Add sorting
    const sortColumn =
      sort_by === 'name'
        ? 's.name'
        : sort_by === 'updated_at'
          ? 's.updated_at'
          : 's.created_at';
    query += ` ORDER BY ${sortColumn} ${sort_order}`;

    // Add pagination
    paramIndex++;
    query += ` LIMIT $${paramIndex}`;
    params.push(limit);

    paramIndex++;
    query += ` OFFSET $${paramIndex}`;
    params.push((page - 1) * limit);

    // Execute queries
    const [sessions, totalResult] = await Promise.all([
      this.sessionRepository.manager.query(query, params),
      this.sessionRepository.manager.query(
        countQuery.replace('SELECT.*FROM', 'SELECT COUNT(*) as total FROM'),
        params.slice(0, -2), // Remove limit and offset params
      ),
    ]);

    const processedSessions = sessions.map((session: any) => {
      const result: any = {
        ...session,
        generation_count: session.generation_count
          ? parseInt(session.generation_count)
          : 0,
        total_credits_spent: session.total_credits_spent
          ? parseFloat(session.total_credits_spent)
          : 0,
      };

      // Add latest_generation if exists
      if (session.latest_generation_id) {
        result.latest_generation = {
          id: parseInt(session.latest_generation_id),
          name: session.latest_generation_name,
          image_url: session.latest_generation_image_url,
          created_at: new Date(session.latest_generation_created_at),
          status: session.latest_generation_status,
        };
      }

      // Remove the flattened latest_generation fields
      delete result.latest_generation_id;
      delete result.latest_generation_name;
      delete result.latest_generation_image_url;
      delete result.latest_generation_created_at;
      delete result.latest_generation_status;

      return result;
    });

    return {
      sessions: processedSessions,
      total: parseInt(totalResult[0]?.total || '0'),
    };
  }

  /**
   * Update a session
   */
  async update(
    sessionId: number,
    userId: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<Session | null> {
    await this.sessionRepository.update(
      { id: sessionId, user_id: userId },
      updateSessionDto,
    );

    return await this.findById(sessionId, userId);
  }

  /**
   * Delete a session (soft delete by setting is_active to false)
   */
  async softDelete(sessionId: number, userId: string): Promise<boolean> {
    const result = await this.sessionRepository.update(
      { id: sessionId, user_id: userId },
      { is_active: false },
    );

    return result.affected > 0;
  }

  /**
   * Check if user owns the session
   */
  async isOwnedByUser(sessionId: number, userId: string): Promise<boolean> {
    const count = await this.sessionRepository.count({
      where: { id: sessionId, user_id: userId },
    });

    return count > 0;
  }

  /**
   * Hard delete a session and handle related generations
   */
  async hardDelete(sessionId: number, userId: string): Promise<boolean> {
    const queryRunner =
      this.sessionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // First, verify session exists and user owns it
      const session = await queryRunner.manager.findOne('sessions', {
        where: { id: sessionId, user_id: userId },
      });

      if (!session) {
        await queryRunner.rollbackTransaction();
        return false;
      }

      // Update generations to remove session_id reference (preserve generations but unlink them)
      // This is safer than cascading delete as it preserves user's generation history
      await queryRunner.manager.query(
        'UPDATE generations SET session_id = NULL WHERE session_id = $1 AND user_id = $2',
        [sessionId, userId],
      );

      // Delete the session
      const deleteResult = await queryRunner.manager.delete('sessions', {
        id: sessionId,
        user_id: userId,
      });

      await queryRunner.commitTransaction();
      return deleteResult.affected > 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to hard delete session ${sessionId} for user ${userId}:`,
        error,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get session statistics for a user
   */
  async getUserSessionStats(userId: string): Promise<{
    total_sessions: number;
    active_sessions: number;
    total_generations: number;
    total_credits_spent: number;
  }> {
    const query = `
      SELECT 
        COUNT(s.id) as total_sessions,
        COUNT(CASE WHEN s.is_active = true THEN 1 END) as active_sessions,
        COALESCE(SUM(g.generation_count), 0) as total_generations,
        COALESCE(SUM(g.total_credits_spent), 0) as total_credits_spent
      FROM sessions s
      LEFT JOIN (
        SELECT 
          session_id,
          COUNT(*) as generation_count,
          SUM(credits_used) as total_credits_spent
        FROM generations
        WHERE session_id IS NOT NULL AND is_active = true
        GROUP BY session_id
      ) g ON s.id = g.session_id
      WHERE s.user_id = $1
    `;

    const result = await this.sessionRepository.manager.query(query, [userId]);

    if (result.length === 0) {
      return {
        total_sessions: 0,
        active_sessions: 0,
        total_generations: 0,
        total_credits_spent: 0,
      };
    }

    return {
      total_sessions: parseInt(result[0].total_sessions) || 0,
      active_sessions: parseInt(result[0].active_sessions) || 0,
      total_generations: parseInt(result[0].total_generations) || 0,
      total_credits_spent: parseFloat(result[0].total_credits_spent) || 0,
    };
  }
}
