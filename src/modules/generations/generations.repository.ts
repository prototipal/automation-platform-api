import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Generation } from './entities';
import { QueryGenerationDto } from './dto';

export interface GenerationWithStats {
  id: number;
  user_id: string;
  session_id: number;
  replicate_id: string;
  model: string;
  model_version: string;
  input_parameters: Record<string, any>;
  output_data?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  credits_used: number;
  error_message?: string;
  supabase_urls?: string[];
  created_at: Date;
  updated_at: Date;
  processing_time_seconds?: number;
  metadata?: Record<string, any>;
  is_active: boolean;
}

@Injectable()
export class GenerationsRepository {
  private readonly logger = new Logger(GenerationsRepository.name);

  constructor(
    @InjectRepository(Generation)
    private readonly generationRepository: Repository<Generation>,
  ) {}

  /**
   * Find generations by user with filtering and pagination
   */
  async findByUser(
    userId: string,
    queryDto: QueryGenerationDto,
  ): Promise<{ generations: Generation[]; total: number }> {
    const {
      is_active = true, // Default to active generations only
      status,
      search,
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = queryDto;

    const queryBuilder = this.generationRepository
      .createQueryBuilder('generation')
      .where('generation.user_id = :userId', { userId })
      .andWhere('generation.is_active = :is_active', { is_active });

    // Add status filter
    if (status) {
      queryBuilder.andWhere('generation.status = :status', { status });
    }

    // Add search filter (searches in prompt from input_parameters)
    if (search) {
      queryBuilder.andWhere(
        "generation.input_parameters->>'prompt' ILIKE :search",
        { search: `%${search}%` },
      );
    }

    // Add sorting
    const sortColumn = `generation.${sort_by}`;
    queryBuilder.orderBy(sortColumn, sort_order as 'ASC' | 'DESC');

    // Add pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [generations, total] = await queryBuilder.getManyAndCount();

    return { generations, total };
  }

  /**
   * Find generations by session with filtering and pagination
   */
  async findBySession(
    sessionId: number,
    userId: string,
    queryDto: QueryGenerationDto,
  ): Promise<{ generations: Generation[]; total: number }> {
    const {
      is_active = true, // Default to active generations only
      status,
      search,
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = queryDto;

    const queryBuilder = this.generationRepository
      .createQueryBuilder('generation')
      .where('generation.session_id = :sessionId', { sessionId })
      .andWhere('generation.user_id = :userId', { userId })
      .andWhere('generation.is_active = :is_active', { is_active });

    // Add status filter
    if (status) {
      queryBuilder.andWhere('generation.status = :status', { status });
    }

    // Add search filter (searches in prompt from input_parameters)
    if (search) {
      queryBuilder.andWhere(
        "generation.input_parameters->>'prompt' ILIKE :search",
        { search: `%${search}%` },
      );
    }

    // Add sorting
    const sortColumn = `generation.${sort_by}`;
    queryBuilder.orderBy(sortColumn, sort_order as 'ASC' | 'DESC');

    // Add pagination
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [generations, total] = await queryBuilder.getManyAndCount();

    return { generations, total };
  }

  /**
   * Find a generation by ID with user validation
   */
  async findById(
    generationId: number,
    userId: string,
    includeInactive: boolean = false,
  ): Promise<Generation | null> {
    const queryBuilder = this.generationRepository
      .createQueryBuilder('generation')
      .where('generation.id = :generationId', { generationId })
      .andWhere('generation.user_id = :userId', { userId });

    if (!includeInactive) {
      queryBuilder.andWhere('generation.is_active = :is_active', {
        is_active: true,
      });
    }

    return await queryBuilder.getOne();
  }

  /**
   * Soft delete a generation (set is_active to false)
   */
  async softDelete(generationId: number, userId: string): Promise<boolean> {
    const result = await this.generationRepository.update(
      { id: generationId, user_id: userId },
      { is_active: false },
    );

    return result.affected > 0;
  }

  /**
   * Soft delete all generations for a session
   */
  async softDeleteBySession(sessionId: number, userId: string): Promise<number> {
    const result = await this.generationRepository.update(
      { session_id: sessionId, user_id: userId },
      { is_active: false },
    );

    return result.affected || 0;
  }

  /**
   * Restore a soft deleted generation
   */
  async restore(generationId: number, userId: string): Promise<boolean> {
    const result = await this.generationRepository.update(
      { id: generationId, user_id: userId },
      { is_active: true },
    );

    return result.affected > 0;
  }

  /**
   * Hard delete a generation (permanently remove from database)
   */
  async hardDelete(generationId: number, userId: string): Promise<boolean> {
    const result = await this.generationRepository.delete({
      id: generationId,
      user_id: userId,
    });

    return result.affected > 0;
  }

  /**
   * Hard delete all generations for a session
   */
  async hardDeleteBySession(sessionId: number, userId: string): Promise<number> {
    const result = await this.generationRepository.delete({
      session_id: sessionId,
      user_id: userId,
    });

    return result.affected || 0;
  }

  /**
   * Check if user owns the generation
   */
  async isOwnedByUser(generationId: number, userId: string): Promise<boolean> {
    const count = await this.generationRepository.count({
      where: { id: generationId, user_id: userId },
    });

    return count > 0;
  }

  /**
   * Get generation statistics for a user
   */
  async getUserGenerationStats(userId: string): Promise<{
    total_generations: number;
    active_generations: number;
    completed_generations: number;
    failed_generations: number;
    total_credits_spent: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_generations,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_generations,
        COUNT(CASE WHEN status = 'completed' AND is_active = true THEN 1 END) as completed_generations,
        COUNT(CASE WHEN status = 'failed' AND is_active = true THEN 1 END) as failed_generations,
        COALESCE(SUM(CASE WHEN is_active = true THEN credits_used ELSE 0 END), 0) as total_credits_spent
      FROM generations
      WHERE user_id = $1
    `;

    const result = await this.generationRepository.manager.query(query, [
      userId,
    ]);

    if (result.length === 0) {
      return {
        total_generations: 0,
        active_generations: 0,
        completed_generations: 0,
        failed_generations: 0,
        total_credits_spent: 0,
      };
    }

    return {
      total_generations: parseInt(result[0].total_generations) || 0,
      active_generations: parseInt(result[0].active_generations) || 0,
      completed_generations: parseInt(result[0].completed_generations) || 0,
      failed_generations: parseInt(result[0].failed_generations) || 0,
      total_credits_spent: parseFloat(result[0].total_credits_spent) || 0,
    };
  }

  /**
   * Get generation statistics for a specific session
   */
  async getSessionGenerationStats(
    sessionId: number,
    userId: string,
  ): Promise<{
    total_generations: number;
    active_generations: number;
    completed_generations: number;
    failed_generations: number;
    total_credits_spent: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total_generations,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_generations,
        COUNT(CASE WHEN status = 'completed' AND is_active = true THEN 1 END) as completed_generations,
        COUNT(CASE WHEN status = 'failed' AND is_active = true THEN 1 END) as failed_generations,
        COALESCE(SUM(CASE WHEN is_active = true THEN credits_used ELSE 0 END), 0) as total_credits_spent
      FROM generations
      WHERE session_id = $1 AND user_id = $2
    `;

    const result = await this.generationRepository.manager.query(query, [
      sessionId,
      userId,
    ]);

    if (result.length === 0) {
      return {
        total_generations: 0,
        active_generations: 0,
        completed_generations: 0,
        failed_generations: 0,
        total_credits_spent: 0,
      };
    }

    return {
      total_generations: parseInt(result[0].total_generations) || 0,
      active_generations: parseInt(result[0].active_generations) || 0,
      completed_generations: parseInt(result[0].completed_generations) || 0,
      failed_generations: parseInt(result[0].failed_generations) || 0,
      total_credits_spent: parseFloat(result[0].total_credits_spent) || 0,
    };
  }

  /**
   * Create a new generation
   */
  async create(generationData: Partial<Generation>): Promise<Generation> {
    const generation = this.generationRepository.create({
      ...generationData,
      is_active: true, // Ensure new generations are active by default
    });

    return await this.generationRepository.save(generation);
  }

  /**
   * Update a generation
   */
  async update(
    generationId: number,
    userId: string,
    updateData: Partial<Generation>,
  ): Promise<Generation | null> {
    await this.generationRepository.update(
      { id: generationId, user_id: userId },
      updateData,
    );

    return await this.findById(generationId, userId, true);
  }
}