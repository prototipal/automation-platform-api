import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { NotificationService } from '../services';
import {
  VideoGenerationCompletedEvent,
  VideoGenerationFailedEvent,
  VideoGenerationProgressEvent,
  CreditRefundEvent,
} from '../events';
import { VideoGenerationNotificationDto } from '../dto';

@Injectable()
export class VideoGenerationListener {
  private readonly logger = new Logger(VideoGenerationListener.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Handle video generation completed event
   */
  @OnEvent('video.generation.completed')
  async handleVideoGenerationCompleted(
    event: VideoGenerationCompletedEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processing video generation completed event for user ${event.userId}, generation ${event.generationId}`,
      );

      const videoData: VideoGenerationNotificationDto = {
        generationId: event.generationId,
        replicateId: event.replicateId,
        userId: event.userId,
        model: event.model,
        modelVersion: event.modelVersion,
        sessionId: event.sessionId,
        videoUrls: event.videoUrls,
        processingTime: event.processingTime,
        creditsUsed: event.creditsUsed,
      };

      const result = await this.notificationService.sendVideoGenerationCompleted(videoData);

      if (result.sent) {
        this.logger.log(
          `Successfully sent video generation completed notification to user ${event.userId}`,
        );
      } else {
        this.logger.warn(
          `Failed to send video generation completed notification to user ${event.userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling video generation completed event for user ${event.userId}:`,
        error,
      );
    }
  }

  /**
   * Handle video generation failed event
   */
  @OnEvent('video.generation.failed')
  async handleVideoGenerationFailed(event: VideoGenerationFailedEvent): Promise<void> {
    try {
      this.logger.log(
        `Processing video generation failed event for user ${event.userId}, generation ${event.generationId}`,
      );

      const videoData: VideoGenerationNotificationDto = {
        generationId: event.generationId,
        replicateId: event.replicateId,
        userId: event.userId,
        model: event.model,
        modelVersion: event.modelVersion,
        sessionId: event.sessionId,
        error: event.error,
        creditsUsed: event.creditsUsed,
      };

      const result = await this.notificationService.sendVideoGenerationFailed(videoData);

      if (result.sent) {
        this.logger.log(
          `Successfully sent video generation failed notification to user ${event.userId}`,
        );
      } else {
        this.logger.warn(
          `Failed to send video generation failed notification to user ${event.userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling video generation failed event for user ${event.userId}:`,
        error,
      );
    }
  }

  /**
   * Handle video generation progress event
   */
  @OnEvent('video.generation.progress')
  async handleVideoGenerationProgress(
    event: VideoGenerationProgressEvent,
  ): Promise<void> {
    try {
      this.logger.log(
        `Processing video generation progress event for user ${event.userId}, generation ${event.generationId}, status: ${event.status}`,
      );

      const result = await this.notificationService.sendVideoGenerationProgress({
        generationId: event.generationId,
        replicateId: event.replicateId,
        userId: event.userId,
        model: event.model,
        modelVersion: event.modelVersion,
        sessionId: event.sessionId,
        status: event.status,
        progress: event.progress,
        estimatedTime: event.estimatedTime,
        startedAt: event.startedAt,
      });

      if (result.sent) {
        this.logger.log(
          `Successfully sent video generation progress notification to user ${event.userId}`,
        );
      } else {
        this.logger.warn(
          `Failed to send video generation progress notification to user ${event.userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling video generation progress event for user ${event.userId}:`,
        error,
      );
    }
  }

  /**
   * Handle credit refund event
   */
  @OnEvent('credit.refund')
  async handleCreditRefund(event: CreditRefundEvent): Promise<void> {
    try {
      this.logger.log(
        `Processing credit refund event for user ${event.userId}: ${event.creditsRefunded} credits`,
      );

      const result = await this.notificationService.sendCreditRefundNotification(
        event.userId,
        event.creditsRefunded,
        event.reason,
        event.generationId,
      );

      if (result.sent) {
        this.logger.log(
          `Successfully sent credit refund notification to user ${event.userId}`,
        );
      } else {
        this.logger.warn(
          `Failed to send credit refund notification to user ${event.userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling credit refund event for user ${event.userId}:`,
        error,
      );
    }
  }
}