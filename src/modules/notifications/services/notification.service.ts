import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import {
  NotificationPayload,
  VideoGenerationNotificationData,
  NotificationType,
  NotificationPriority,
  SupabaseBroadcastPayload,
} from '../interfaces';
import {
  CreateNotificationDto,
  VideoGenerationNotificationDto,
  NotificationResponseDto,
} from '../dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly supabaseClient: SupabaseClient;

  // Notification channel constants
  private readonly NOTIFICATION_CHANNEL = 'notifications';
  private readonly USER_CHANNEL_PREFIX = 'user_';

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('supabase.url');
    const supabaseServiceRoleKey = this.configService.get<string>('supabase.serviceRoleKey');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase configuration is missing for NotificationService');
    }

    // Use service role key for server-side operations
    this.supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    this.logger.log('NotificationService initialized with Supabase Realtime');
  }

  /**
   * Send a generic notification to a user
   */
  async sendNotification(
    notificationData: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    try {
      const notification = this.createNotificationPayload(notificationData);
      
      // Send via Supabase broadcast
      const success = await this.broadcastToUser(notification.userId, notification);
      
      this.logger.log(
        `Notification sent to user ${notification.userId}: ${notification.type} - ${success ? 'SUCCESS' : 'FAILED'}`,
      );

      return this.mapToResponseDto(notification, success);
    } catch (error) {
      this.logger.error(
        `Failed to send notification to user ${notificationData.userId}:`,
        error,
      );
      
      // Return failed response
      const notification = this.createNotificationPayload(notificationData);
      return this.mapToResponseDto(notification, false);
    }
  }

  /**
   * Send video generation completed notification
   */
  async sendVideoGenerationCompleted(
    videoData: VideoGenerationNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notificationData: CreateNotificationDto = {
      userId: videoData.userId,
      type: NotificationType.VIDEO_GENERATION_COMPLETED,
      title: 'Video Generated Successfully! 🎥',
      message: this.generateVideoCompletedMessage(videoData),
      data: {
        generationId: videoData.generationId,
        replicateId: videoData.replicateId,
        model: videoData.model,
        modelVersion: videoData.modelVersion,
        sessionId: videoData.sessionId,
        videoUrls: videoData.videoUrls || [],
        processingTime: videoData.processingTime,
        creditsUsed: videoData.creditsUsed,
      } as VideoGenerationNotificationData,
      priority: NotificationPriority.HIGH,
      persistent: true,
    };

    return this.sendNotification(notificationData);
  }

  /**
   * Send video generation failed notification
   */
  async sendVideoGenerationFailed(
    videoData: VideoGenerationNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notificationData: CreateNotificationDto = {
      userId: videoData.userId,
      type: NotificationType.VIDEO_GENERATION_FAILED,
      title: 'Video Generation Failed ❌',
      message: this.generateVideoFailedMessage(videoData),
      data: {
        generationId: videoData.generationId,
        replicateId: videoData.replicateId,
        model: videoData.model,
        modelVersion: videoData.modelVersion,
        sessionId: videoData.sessionId,
        error: videoData.error,
        creditsUsed: videoData.creditsUsed,
      } as VideoGenerationNotificationData,
      priority: NotificationPriority.HIGH,
      persistent: true,
    };

    return this.sendNotification(notificationData);
  }

  /**
   * Send video generation progress notification
   */
  async sendVideoGenerationProgress(
    videoData: VideoGenerationNotificationDto,
  ): Promise<NotificationResponseDto> {
    const statusMessage = videoData.status === 'starting' 
      ? 'Your video generation is starting...' 
      : 'Your video is being processed...';
    
    const progressInfo = videoData.progress ? ` (${videoData.progress}% complete)` : '';
    const timeInfo = videoData.estimatedTime ? ` - ${Math.round(videoData.estimatedTime / 60)} min remaining` : '';

    const notificationData: CreateNotificationDto = {
      userId: videoData.userId,
      type: NotificationType.VIDEO_GENERATION_PROGRESS,
      title: `Video Generation ${videoData.status === 'starting' ? 'Starting' : 'In Progress'} 🎬`,
      message: `${statusMessage}${progressInfo}${timeInfo}`,
      data: {
        generationId: videoData.generationId,
        replicateId: videoData.replicateId,
        model: videoData.model,
        modelVersion: videoData.modelVersion,
        sessionId: videoData.sessionId,
        status: videoData.status,
        progress: videoData.progress,
        estimatedTime: videoData.estimatedTime,
        startedAt: videoData.startedAt,
      },
      priority: NotificationPriority.NORMAL,
      persistent: false, // Progress notifications are temporary
    };

    return this.sendNotification(notificationData);
  }

  /**
   * Send credit refund notification
   */
  async sendCreditRefundNotification(
    userId: string,
    creditsRefunded: number,
    reason: string,
    generationId?: string,
  ): Promise<NotificationResponseDto> {
    const notificationData: CreateNotificationDto = {
      userId,
      type: NotificationType.CREDIT_REFUND,
      title: 'Credits Refunded 💰',
      message: `${creditsRefunded} credits have been refunded to your account. Reason: ${reason}`,
      data: {
        creditsRefunded,
        reason,
        generationId,
        refundedAt: new Date().toISOString(),
      },
      priority: NotificationPriority.NORMAL,
      persistent: true,
    };

    return this.sendNotification(notificationData);
  }

  /**
   * Send low credit warning notification
   */
  async sendLowCreditWarning(
    userId: string,
    remainingCredits: number,
    threshold: number = 10,
  ): Promise<NotificationResponseDto> {
    const notificationData: CreateNotificationDto = {
      userId,
      type: NotificationType.CREDIT_LOW_WARNING,
      title: 'Low Credit Warning ⚠️',
      message: `You have ${remainingCredits} credits remaining. Consider upgrading your package to continue generating content.`,
      data: {
        remainingCredits,
        threshold,
        warningAt: new Date().toISOString(),
      },
      priority: NotificationPriority.NORMAL,
      persistent: true,
    };

    return this.sendNotification(notificationData);
  }

  /**
   * Broadcast notification to specific user channel
   */
  private async broadcastToUser(
    userId: string,
    notification: NotificationPayload,
  ): Promise<boolean> {
    try {
      const channelName = `${this.USER_CHANNEL_PREFIX}${userId}`;
      
      const broadcastPayload: SupabaseBroadcastPayload = {
        event: 'notification',
        payload: notification,
      };

      // Send to user-specific channel
      const response = await this.supabaseClient
        .channel(channelName)
        .send({
          type: 'broadcast',
          event: broadcastPayload.event,
          payload: broadcastPayload.payload,
        });

      if (response !== 'ok') {
        this.logger.error(`Failed to broadcast to user ${userId}:`, response);
        return false;
      }

      // Also send to general notifications channel for fallback
      await this.broadcastToGeneralChannel(notification);

      return true;
    } catch (error) {
      this.logger.error(`Error broadcasting to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Broadcast to general notifications channel
   */
  private async broadcastToGeneralChannel(
    notification: NotificationPayload,
  ): Promise<boolean> {
    try {
      const response = await this.supabaseClient
        .channel(this.NOTIFICATION_CHANNEL)
        .send({
          type: 'broadcast',
          event: 'notification',
          payload: notification,
        });

      if (response !== 'ok') {
        this.logger.error('Failed to broadcast to general channel:', response);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error broadcasting to general channel:', error);
      return false;
    }
  }

  /**
   * Create notification payload from DTO
   */
  private createNotificationPayload(
    notificationData: CreateNotificationDto,
  ): NotificationPayload {
    return {
      id: uuidv4(),
      userId: notificationData.userId,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      timestamp: new Date().toISOString(),
      priority: notificationData.priority || NotificationPriority.NORMAL,
      persistent: notificationData.persistent ?? true,
    };
  }

  /**
   * Generate video completed message
   */
  private generateVideoCompletedMessage(videoData: VideoGenerationNotificationDto): string {
    const videoCount = videoData.videoUrls?.length || 0;
    const processingTime = videoData.processingTime ? ` in ${Math.round(videoData.processingTime)}s` : '';
    const creditsInfo = videoData.creditsUsed ? ` using ${videoData.creditsUsed} credits` : '';
    
    return `Your ${videoData.modelVersion.replace(/_/g, ' ').toUpperCase()} video${videoCount > 1 ? 's' : ''} ${videoCount > 1 ? 'have' : 'has'} been generated successfully${processingTime}${creditsInfo}. ${videoCount > 0 ? `${videoCount} video${videoCount > 1 ? 's' : ''} ready for download.` : ''}`;
  }

  /**
   * Generate video failed message
   */
  private generateVideoFailedMessage(videoData: VideoGenerationNotificationDto): string {
    const errorInfo = videoData.error ? `: ${videoData.error}` : '';
    const creditsInfo = videoData.creditsUsed ? ` Your ${videoData.creditsUsed} credits have been refunded.` : '';
    
    return `Your ${videoData.modelVersion.replace(/_/g, ' ').toUpperCase()} video generation failed${errorInfo}.${creditsInfo}`;
  }

  /**
   * Map notification payload to response DTO
   */
  private mapToResponseDto(
    notification: NotificationPayload,
    sent: boolean,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: notification.timestamp,
      priority: notification.priority || NotificationPriority.NORMAL,
      persistent: notification.persistent ?? true,
      sent,
    };
  }

  /**
   * Get Supabase client for external usage (if needed)
   */
  getSupabaseClient(): SupabaseClient {
    return this.supabaseClient;
  }

  /**
   * Health check for notification service
   */
  async healthCheck(): Promise<{ status: string; supabase: boolean }> {
    try {
      // Test Supabase connection by attempting to create a test channel
      const testChannel = this.supabaseClient.channel('health_check');
      const isHealthy = testChannel !== null;
      
      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        supabase: isHealthy,
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        supabase: false,
      };
    }
  }
}