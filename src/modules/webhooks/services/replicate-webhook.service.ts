import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac, timingSafeEqual } from 'crypto';
import { firstValueFrom } from 'rxjs';

import { GenerationsRepository } from '@/modules/generations/generations.repository';
import { StorageService } from '@/modules/storage';
import { CreditManagementService } from '@/modules/credits/services';
import { CreditSource } from '@/modules/credits/enums';
import { PackagesService } from '@/modules/packages';
import { TextToVideoModelVersion, ServiceModel } from '@/modules/services/enums';
import { ReplicateWebhookDto, ReplicateWebhookStatus } from '../dto';
import {
  VideoGenerationCompletedEvent,
  VideoGenerationFailedEvent,
  VideoGenerationProgressEvent,
  CreditRefundEvent,
} from '@/modules/notifications';

@Injectable()
export class ReplicateWebhookService {
  private readonly logger = new Logger(ReplicateWebhookService.name);
  private readonly webhookSecret: string;

  // Video models that require webhook handling
  private readonly videoModels = [
    TextToVideoModelVersion.KLING_V2_1,
    TextToVideoModelVersion.HAILUO_02,
    TextToVideoModelVersion.VIDEO_01,
    TextToVideoModelVersion.SEEDANCE_1_PRO,
    TextToVideoModelVersion.VEO_3,
    TextToVideoModelVersion.VEO_3_FAST,
  ];

  // Retry configuration
  private readonly maxRetries = 3;
  private readonly retryDelays = [1000, 3000, 9000]; // Exponential backoff in ms

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    private readonly generationsRepository: GenerationsRepository,
    private readonly storageService: StorageService,
    private readonly creditManagementService: CreditManagementService,
    private readonly packagesService: PackagesService,
  ) {
    this.webhookSecret = this.configService.get<string>('REPLICATE_WEBHOOK_SECRET') || '';
    
    if (!this.webhookSecret) {
      this.logger.warn('REPLICATE_WEBHOOK_SECRET is not configured');
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * Based on Replicate documentation: https://replicate.com/docs/topics/webhooks/verify-webhook
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    timestamp: string,
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true; // Allow in development/testing
    }

    if (!signature || !timestamp) {
      this.logger.warn('Missing signature or timestamp headers');
      return false;
    }

    try {
      // Check timestamp to prevent replay attacks (allow 5 minutes tolerance)
      const webhookTimestamp = parseInt(timestamp, 10);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timeDifference = Math.abs(currentTimestamp - webhookTimestamp);
      
      if (timeDifference > 300) { // 5 minutes
        this.logger.warn(`Webhook timestamp too old: ${timeDifference} seconds`);
        return false;
      }

      // Create the signed payload: timestamp + payload
      const signedPayload = timestamp + payload;

      // Compute expected signature
      const expectedSignature = createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      // Extract signature from header (format: "v1=<signature>")
      const signatureParts = signature.split('=');
      if (signatureParts.length !== 2 || signatureParts[0] !== 'v1') {
        this.logger.warn('Invalid signature format');
        return false;
      }

      const receivedSignature = signatureParts[1];

      // Use timing-safe comparison to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const receivedBuffer = Buffer.from(receivedSignature, 'hex');

      if (expectedBuffer.length !== receivedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, receivedBuffer);
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Process Replicate webhook event with retry logic
   */
  async processWebhookEvent(webhookData: any): Promise<void> {
    this.logger.log(`Processing webhook for prediction: ${webhookData.id || 'unknown'}`);
    
    // DEBUG: Log the webhook data structure
    this.logger.debug('Webhook data received in service:', {
      id: webhookData.id,
      status: webhookData.status,
      model: webhookData.model,
      version: webhookData.version,
      hasOutput: !!webhookData.output,
      outputType: typeof webhookData.output,
      allKeys: Object.keys(webhookData || {}),
    });

    // Check if this is a video model prediction
    const isVideoModel = this.isVideoModelPrediction(webhookData);
    if (!isVideoModel) {
      this.logger.debug(`Ignoring webhook for non-video model: ${webhookData.model}`);
      return;
    }

    // Process with retry logic
    await this.processWithRetry(webhookData, 0);
  }

  /**
   * Process webhook with exponential backoff retry
   */
  private async processWithRetry(
    webhookData: ReplicateWebhookDto,
    attempt: number,
  ): Promise<void> {
    try {
      await this.processVideoGeneration(webhookData);
      this.logger.log(`Successfully processed webhook for prediction: ${webhookData.id}`);
    } catch (error) {
      this.logger.error(
        `Attempt ${attempt + 1} failed for prediction ${webhookData.id}:`,
        error,
      );

      if (attempt < this.maxRetries - 1) {
        const delay = this.retryDelays[attempt];
        this.logger.log(`Retrying in ${delay}ms (attempt ${attempt + 2}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.processWithRetry(webhookData, attempt + 1);
      } else {
        this.logger.error(
          `All retry attempts failed for prediction ${webhookData.id}. Final error:`,
          error,
        );
        
        // Handle final failure - mark as failed and potentially refund credits
        await this.handleFinalFailure(webhookData, error);
        throw error;
      }
    }
  }

  /**
   * Process video generation webhook
   */
  private async processVideoGeneration(webhookData: ReplicateWebhookDto): Promise<void> {
    // Find the generation in our database
    const generation = await this.generationsRepository.findByReplicateId(webhookData.id);
    
    if (!generation) {
      this.logger.warn(`Generation not found for Replicate ID: ${webhookData.id}`);
      return;
    }

    const isSuccess = webhookData.status === ReplicateWebhookStatus.SUCCEEDED;
    const isFailed = webhookData.status === ReplicateWebhookStatus.FAILED || 
                     webhookData.status === ReplicateWebhookStatus.CANCELED;

    if (isSuccess) {
      await this.handleSuccessfulGeneration(generation, webhookData);
    } else if (isFailed) {
      await this.handleFailedGeneration(generation, webhookData);
    } else if (webhookData.status === ReplicateWebhookStatus.STARTING || 
               webhookData.status === ReplicateWebhookStatus.PROCESSING) {
      await this.handleProgressUpdate(generation, webhookData);
    } else {
      this.logger.warn(`Unknown webhook status: ${webhookData.status} for prediction: ${webhookData.id}`);
    }
  }

  /**
   * Handle successful generation
   */
  private async handleSuccessfulGeneration(
    generation: any,
    webhookData: ReplicateWebhookDto,
  ): Promise<void> {
    try {
      // Extract video URLs from webhook output
      const videoUrls = this.extractVideoUrls(webhookData.output);
      
      this.logger.log(
        `Processing ${videoUrls.length} video files for generation ${generation.id}`,
      );

      // Upload videos to Supabase
      let supabaseUrls: string[] = [];
      if (videoUrls.length > 0) {
        try {
          const uploadResults = await this.storageService.uploadMultipleFromUrls(videoUrls, {
            userId: generation.user_id,
            sessionId: generation.session_id,
            folder: 'generations/videos',
            fileName: `gen_${generation.replicate_id}`,
            metadata: {
              model: generation.model,
              model_version: generation.model_version,
              replicate_id: generation.replicate_id,
              webhook_processed_at: new Date().toISOString(),
            },
          });

          supabaseUrls = uploadResults.map((result) => result.public_url);
          this.logger.log(`Successfully uploaded ${supabaseUrls.length} videos to Supabase`);
        } catch (uploadError) {
          this.logger.error('Failed to upload videos to Supabase:', uploadError);
          // Continue without failing the entire process
        }
      }

      // Calculate processing time
      const processingTime = this.calculateProcessingTime(
        generation.created_at,
        webhookData.completed_at || new Date().toISOString(),
      );

      // Update generation status
      await this.generationsRepository.updateById(generation.id, {
        status: 'completed',
        output_data: this.cleanOutputData(webhookData),
        supabase_urls: supabaseUrls.length > 0 ? supabaseUrls : undefined,
        processing_time_seconds: processingTime,
        error_message: null,
        updated_at: new Date(),
        metadata: {
          ...generation.metadata,
          webhook_processed_at: new Date().toISOString(),
          replicate_completed_at: webhookData.completed_at,
          logs: webhookData.logs ? '[LOGS_TRUNCATED]' : undefined,
        },
      });

      this.logger.log(`Generation ${generation.id} marked as completed with ${supabaseUrls.length} videos`);

      // Emit event for real-time notification
      await this.emitVideoGenerationCompletedEvent(generation, supabaseUrls, processingTime);

    } catch (error) {
      this.logger.error(`Failed to handle successful generation ${generation.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle progress update (starting/processing)
   */
  private async handleProgressUpdate(
    generation: any,
    webhookData: ReplicateWebhookDto,
  ): Promise<void> {
    try {
      const status = webhookData.status === ReplicateWebhookStatus.STARTING ? 'starting' : 'processing';
      
      // Update generation status in database
      await this.generationsRepository.updateById(generation.id, {
        status,
        updated_at: new Date(),
        metadata: {
          ...generation.metadata,
          last_progress_update: new Date().toISOString(),
          replicate_status: webhookData.status,
          started_at: webhookData.started_at,
        },
      });

      this.logger.log(`Generation ${generation.id} status updated to ${status}`);

      // Emit progress event for real-time notification
      await this.emitVideoGenerationProgressEvent(
        generation, 
        status as 'starting' | 'processing',
        webhookData.started_at
      );

    } catch (error) {
      this.logger.error(`Failed to handle progress update for generation ${generation.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle failed generation
   */
  private async handleFailedGeneration(
    generation: any,
    webhookData: ReplicateWebhookDto,
  ): Promise<void> {
    try {
      // Update generation status to failed
      await this.generationsRepository.updateById(generation.id, {
        status: 'failed',
        error_message: webhookData.error || 'Generation failed',
        updated_at: new Date(),
        metadata: {
          ...generation.metadata,
          webhook_processed_at: new Date().toISOString(),
          replicate_status: webhookData.status,
          logs: webhookData.logs ? '[LOGS_TRUNCATED]' : undefined,
        },
      });

      // Attempt to refund credits
      await this.refundCredits(generation, webhookData.error || 'Generation failed');

      this.logger.log(`Generation ${generation.id} marked as failed and credits refunded`);

      // Emit event for real-time notification
      await this.emitVideoGenerationFailedEvent(generation, webhookData.error || 'Generation failed');

    } catch (error) {
      this.logger.error(`Failed to handle failed generation ${generation.id}:`, error);
      throw error;
    }
  }

  /**
   * Handle final failure after all retries
   */
  private async handleFinalFailure(
    webhookData: ReplicateWebhookDto,
    error: any,
  ): Promise<void> {
    try {
      const generation = await this.generationsRepository.findByReplicateId(webhookData.id);
      
      if (generation) {
        await this.generationsRepository.updateById(generation.id, {
          status: 'failed',
          error_message: `Webhook processing failed after ${this.maxRetries} attempts: ${error.message}`,
          updated_at: new Date(),
          metadata: {
            ...generation.metadata,
            webhook_failed_at: new Date().toISOString(),
            webhook_error: error.message,
          },
        });

        // Attempt to refund credits
        await this.refundCredits(generation, `Processing failed after ${this.maxRetries} attempts`);
      }
    } catch (updateError) {
      this.logger.error('Failed to handle final failure:', updateError);
    }
  }

  /**
   * Refund credits to user
   */
  private async refundCredits(generation: any, reason: string): Promise<void> {
    try {
      if (!generation.credits_used || generation.credits_used <= 0) {
        this.logger.debug(`No credits to refund for generation ${generation.id}`);
        return;
      }

      // Add credits back to user account using refillCredits
      await this.creditManagementService.refillCredits({
        user_id: generation.user_id,
        api_credits: generation.credits_used,
        source: CreditSource.GENERATION_REFUND,
        description: `Refund for failed generation - ${generation.model} ${generation.model_version}: ${reason}`,
        metadata: {
          generation_id: generation.id,
          replicate_id: generation.replicate_id,
          original_credits_used: generation.credits_used,
        },
      });

      // Update package usage counters (subtract the usage)
      await this.packagesService.updateUsageCounters(
        generation.user_id,
        -generation.credits_used, // Negative to subtract
        -1, // Subtract one generation
      );

      this.logger.log(
        `Refunded ${generation.credits_used} credits to user ${generation.user_id} for failed generation ${generation.id}`,
      );

      // Emit credit refund event for notification
      const refundEvent = new CreditRefundEvent(
        generation.user_id,
        generation.credits_used,
        reason,
        generation.id,
      );
      this.eventEmitter.emit('credit.refund', refundEvent);
    } catch (error) {
      this.logger.error(
        `Failed to refund credits for generation ${generation.id}:`,
        error,
      );
      // Don't throw here, as the generation status update is more important
    }
  }

  /**
   * Check if this is a video model prediction
   */
  private isVideoModelPrediction(webhookData: ReplicateWebhookDto): boolean {
    // Extract model version from the model string (e.g., "bytedance/seedance-1-pro" -> "seedance-1-pro")
    const modelParts = webhookData.model.split('/');
    const modelName = modelParts[modelParts.length - 1];
    
    return this.videoModels.some(videoModel => 
      modelName.includes(videoModel) || videoModel.includes(modelName.replace('-', '_'))
    );
  }

  /**
   * Extract video URLs from webhook output
   */
  private extractVideoUrls(output: any): string[] {
    if (!output) return [];

    const urls: string[] = [];

    if (Array.isArray(output)) {
      output.forEach((item: any) => {
        if (typeof item === 'string' && this.isVideoUrl(item)) {
          urls.push(item);
        }
      });
    } else if (typeof output === 'string' && this.isVideoUrl(output)) {
      urls.push(output);
    }

    return urls;
  }

  /**
   * Check if URL is a video file
   */
  private isVideoUrl(url: string): boolean {
    if (!url || !(url.startsWith('http://') || url.startsWith('https://'))) {
      return false;
    }

    // Skip API URLs
    if (
      url.includes('api.replicate.com') ||
      url.includes('/cancel') ||
      url.includes('/stream')
    ) {
      return false;
    }

    // Check for video file extensions or delivery domains
    const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m4v'];
    const isVideoExtension = videoExtensions.some(ext => 
      url.toLowerCase().includes(ext)
    );

    const isVideoDelivery = url.includes('replicate.delivery') || 
                           url.includes('replicate-delivery') ||
                           url.includes('video');

    return isVideoExtension || isVideoDelivery;
  }

  /**
   * Clean output data for storage (remove sensitive info, truncate logs)
   */
  private cleanOutputData(webhookData: ReplicateWebhookDto): Record<string, any> {
    return {
      id: webhookData.id,
      model: webhookData.model,
      version: webhookData.version,
      status: webhookData.status,
      output: webhookData.output,
      created_at: webhookData.created_at,
      started_at: webhookData.started_at,
      completed_at: webhookData.completed_at,
      metrics: webhookData.metrics,
      // Don't store full logs to save space, but keep a flag
      logs_available: !!webhookData.logs,
    };
  }

  /**
   * Calculate processing time in seconds
   */
  private calculateProcessingTime(startTime: string | Date, endTime: string): number {
    try {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      return Math.round((end - start) / 1000 * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      this.logger.warn('Failed to calculate processing time:', error);
      return 0;
    }
  }

  /**
   * Handle duplicate webhook calls gracefully
   */
  async isDuplicateWebhook(predictionId: string, status: string): Promise<boolean> {
    try {
      const generation = await this.generationsRepository.findByReplicateId(predictionId);
      
      if (!generation) {
        return false; // Not a duplicate if we don't have the generation
      }

      // Check if we've already processed this status
      if (generation.status === 'completed' && status === 'succeeded') {
        this.logger.debug(`Duplicate completed webhook for prediction: ${predictionId}`);
        return true;
      }

      if (generation.status === 'failed' && (status === 'failed' || status === 'canceled')) {
        this.logger.debug(`Duplicate failed webhook for prediction: ${predictionId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking for duplicate webhook:', error);
      return false; // Assume not duplicate on error
    }
  }

  /**
   * Emit video generation completed event
   */
  private async emitVideoGenerationCompletedEvent(
    generation: any,
    videoUrls: string[],
    processingTime?: number,
  ): Promise<void> {
    try {
      const event = new VideoGenerationCompletedEvent(
        generation.id,
        generation.replicate_id,
        generation.user_id,
        generation.model,
        generation.model_version,
        generation.session_id,
        videoUrls,
        processingTime,
        generation.credits_used,
      );

      this.eventEmitter.emit('video.generation.completed', event);
      this.logger.log(`Emitted video generation completed event for generation ${generation.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit video generation completed event for generation ${generation.id}:`,
        error,
      );
    }
  }

  /**
   * Emit video generation progress event
   */
  private async emitVideoGenerationProgressEvent(
    generation: any,
    status: 'starting' | 'processing',
    startedAt?: string,
  ): Promise<void> {
    try {
      const event = new VideoGenerationProgressEvent(
        generation.id,
        generation.replicate_id,
        generation.user_id,
        generation.model,
        generation.model_version,
        generation.session_id,
        status,
        undefined, // progress percentage - could be calculated based on time elapsed
        undefined, // estimatedTime - could be calculated based on model averages
        startedAt,
      );

      this.eventEmitter.emit('video.generation.progress', event);
      this.logger.log(`Emitted video generation progress event for generation ${generation.id} - status: ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit video generation progress event for generation ${generation.id}:`,
        error,
      );
    }
  }

  /**
   * Emit video generation failed event
   */
  private async emitVideoGenerationFailedEvent(
    generation: any,
    error: string,
  ): Promise<void> {
    try {
      const event = new VideoGenerationFailedEvent(
        generation.id,
        generation.replicate_id,
        generation.user_id,
        generation.model,
        generation.model_version,
        generation.session_id,
        error,
        generation.credits_used,
      );

      this.eventEmitter.emit('video.generation.failed', event);
      this.logger.log(`Emitted video generation failed event for generation ${generation.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to emit video generation failed event for generation ${generation.id}:`,
        error,
      );
    }
  }
}