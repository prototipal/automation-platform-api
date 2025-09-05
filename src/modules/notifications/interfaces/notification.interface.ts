export interface NotificationPayload {
  /**
   * Unique identifier for the notification
   */
  id: string;

  /**
   * User ID who should receive the notification
   */
  userId: string;

  /**
   * Type of notification
   */
  type: NotificationType;

  /**
   * Title of the notification
   */
  title: string;

  /**
   * Detailed message content
   */
  message: string;

  /**
   * Additional data specific to notification type
   */
  data?: Record<string, any>;

  /**
   * Timestamp when notification was created
   */
  timestamp: string;

  /**
   * Priority level of the notification
   */
  priority?: NotificationPriority;

  /**
   * Whether the notification should be persisted
   */
  persistent?: boolean;
}

export interface VideoGenerationNotificationData {
  /**
   * Generation ID in our database
   */
  generationId: string;

  /**
   * Replicate prediction ID
   */
  replicateId: string;

  /**
   * Model used for generation
   */
  model: string;

  /**
   * Model version
   */
  modelVersion: string;

  /**
   * Session ID associated with the generation
   */
  sessionId: string;

  /**
   * Video URLs (Supabase URLs)
   */
  videoUrls?: string[];

  /**
   * Processing time in seconds
   */
  processingTime?: number;

  /**
   * Credits used for generation
   */
  creditsUsed?: number;

  /**
   * Error message if generation failed
   */
  error?: string;
}

export interface SupabaseBroadcastPayload {
  /**
   * Event type for Supabase broadcast
   */
  event: string;

  /**
   * Payload data to broadcast
   */
  payload: NotificationPayload;
}

export enum NotificationType {
  VIDEO_GENERATION_COMPLETED = 'video_generation_completed',
  VIDEO_GENERATION_FAILED = 'video_generation_failed',
  VIDEO_GENERATION_PROGRESS = 'video_generation_progress',
  CREDIT_LOW_WARNING = 'credit_low_warning',
  CREDIT_REFUND = 'credit_refund',
  PACKAGE_UPGRADED = 'package_upgraded',
  SYSTEM_MAINTENANCE = 'system_maintenance',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}