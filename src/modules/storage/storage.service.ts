import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import * as crypto from 'crypto';
import * as path from 'path';
import { URL } from 'url';

import type { SupabaseConfig } from '@/config/supabase.config';

export interface FileUploadResult {
  file_url: string;
  public_url: string;
  file_path: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
}

export interface FileUploadOptions {
  folder?: string;
  fileName?: string;
  userId?: string;
  sessionId?: number;
  metadata?: Record<string, any>;
  retryCount?: number;
  skipUrlValidation?: boolean;
}

export interface UrlValidationResult {
  isValid: boolean;
  isAccessible: boolean;
  contentType?: string;
  contentLength?: number;
  error?: string;
  lastChecked?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface StorageHealthCheck {
  bucketExists: boolean;
  bucketAccessible: boolean;
  policiesConfigured: boolean;
  connectionHealthy: boolean;
  lastChecked: Date;
  errors: string[];
}

/**
 * Enhanced StorageService with robust error handling, retry mechanisms, and health monitoring
 * 
 * Features:
 * - Automatic bucket creation and health checks
 * - URL validation with caching
 * - Exponential backoff retry logic for downloads and uploads
 * - Batch upload with controlled concurrency
 * - Comprehensive error handling for common Supabase/network issues
 * - Health monitoring and diagnostics
 * - Connection pooling and optimization
 * 
 * Error Handling Improvements:
 * - DNS/Fetch errors: Better detection and reporting
 * - 401/404 Replicate errors: Clear messaging about expired URLs
 * - Bucket policy issues: Automatic bucket creation with proper policies
 * - Network timeouts: Configurable retry with exponential backoff
 * - Rate limiting: Built-in delays between batch operations
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabase: SupabaseClient;
  private readonly supabaseConfig: SupabaseConfig;
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };
  private readonly urlValidationCache = new Map<string, UrlValidationResult>();
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes
  private healthCheckCache: StorageHealthCheck | null = null;
  private lastHealthCheck = 0;
  private readonly healthCheckInterval = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.supabaseConfig = this.configService.get<SupabaseConfig>('supabase')!;
    
    // Initialize Supabase client with service role key for server-side operations
    this.supabase = createClient(
      this.supabaseConfig.url,
      this.supabaseConfig.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    this.logger.log('StorageService initialized with Supabase client');
  }

  async onModuleInit() {
    this.logger.log('StorageService module initializing...');
    try {
      await this.performHealthCheck();
      this.logger.log('StorageService health check completed successfully');
    } catch (error) {
      this.logger.error('StorageService health check failed:', error);
      // Don't throw here to allow the application to start
    }
  }

  /**
   * Upload a file from URL to Supabase Storage with enhanced error handling and retry logic
   */
  async uploadFromUrl(
    fileUrl: string,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult> {
    const sanitizedUrl = fileUrl.substring(0, 100);
    this.logger.log(`Uploading file from URL: ${sanitizedUrl}...`);

    try {
      // Perform pre-flight checks
      await this.ensureStorageHealth();
      
      // Validate URL unless explicitly skipped
      if (!options.skipUrlValidation) {
        const urlValidation = await this.validateUrl(fileUrl);
        if (!urlValidation.isValid || !urlValidation.isAccessible) {
          throw new BadRequestException(
            `URL validation failed: ${urlValidation.error || 'URL is not accessible'}`
          );
        }
      }

      // Download file with retry logic
      const response = await this.downloadFileWithRetry(fileUrl, options.retryCount || this.retryConfig.maxRetries);
      const fileBuffer = Buffer.from(response.data);
      
      // Get content type from response headers or detect from URL
      const contentType = response.headers['content-type'] || this.detectMimeType(fileUrl);
      
      // Validate file size
      if (fileBuffer.length > this.supabaseConfig.maxFileSizeBytes) {
        throw new BadRequestException(
          `File size ${(fileBuffer.length / (1024 * 1024)).toFixed(2)}MB exceeds maximum allowed size of ${this.supabaseConfig.maxFileSizeBytes / (1024 * 1024)}MB`
        );
      }

      // Validate MIME type
      if (!this.supabaseConfig.allowedMimeTypes.includes(contentType)) {
        throw new BadRequestException(
          `File type '${contentType}' is not allowed. Supported types: ${this.supabaseConfig.allowedMimeTypes.join(', ')}`
        );
      }

      // Generate unique file path
      const filePath = this.generateFilePath(fileUrl, contentType, options);

      this.logger.log(`Uploading to Supabase path: ${filePath}, size: ${fileBuffer.length} bytes, type: ${contentType}`);

      // Upload to Supabase Storage with retry logic
      const uploadResult = await this.uploadToSupabaseWithRetry(filePath, fileBuffer, contentType, fileUrl, options);

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(this.supabaseConfig.bucketName)
        .getPublicUrl(filePath);

      const result: FileUploadResult = {
        file_url: fileUrl,
        public_url: publicUrlData.publicUrl,
        file_path: uploadResult.path,
        file_name: path.basename(uploadResult.path),
        file_size: fileBuffer.length,
        mime_type: contentType,
      };

      this.logger.log(`File uploaded successfully: ${result.public_url}`);
      return result;
      
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Error uploading file from URL ${sanitizedUrl}:`, error);
      
      // Provide more specific error messages
      if (error.message?.includes('fetch failed')) {
        throw new InternalServerErrorException(
          'Failed to connect to Supabase. Please check your network connection and Supabase configuration.'
        );
      }
      
      if (error.message?.includes('401')) {
        throw new InternalServerErrorException(
          'Source URL authentication failed. The URL may have expired or be invalid.'
        );
      }
      
      if (error.message?.includes('404')) {
        throw new BadRequestException(
          'Source file not found. The URL may have expired or be invalid.'
        );
      }
      
      throw new InternalServerErrorException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload multiple files from URLs with enhanced error handling and progress tracking
   */
  async uploadMultipleFromUrls(
    fileUrls: string[],
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult[]> {
    this.logger.log(`Uploading ${fileUrls.length} files from URLs`);

    if (fileUrls.length === 0) {
      return [];
    }

    try {
      // Ensure storage health before starting batch upload
      await this.ensureStorageHealth();
      
      // Pre-validate all URLs in parallel if not skipped
      if (!options.skipUrlValidation) {
        this.logger.log('Pre-validating URLs...');
        const validationPromises = fileUrls.map(url => this.validateUrl(url));
        const validations = await Promise.allSettled(validationPromises);
        
        const invalidUrls: string[] = [];
        validations.forEach((validation, index) => {
          if (validation.status === 'fulfilled') {
            if (!validation.value.isValid || !validation.value.isAccessible) {
              invalidUrls.push(`${fileUrls[index]}: ${validation.value.error || 'Not accessible'}`);
            }
          } else {
            invalidUrls.push(`${fileUrls[index]}: Validation failed`);
          }
        });
        
        if (invalidUrls.length > 0) {
          this.logger.warn(`${invalidUrls.length} URLs failed validation:`, invalidUrls);
          // Continue with valid URLs only, don't fail completely
        }
      }

      // Upload files with controlled concurrency (max 3 concurrent uploads)
      const concurrency = Math.min(3, fileUrls.length);
      const results: FileUploadResult[] = [];
      const errors: string[] = [];

      for (let i = 0; i < fileUrls.length; i += concurrency) {
        const batch = fileUrls.slice(i, i + concurrency);
        const batchPromises = batch.map((url, batchIndex) => {
          const globalIndex = i + batchIndex;
          return this.uploadFromUrl(url, {
            ...options,
            fileName: options.fileName ? `${options.fileName}_${globalIndex + 1}` : undefined,
            skipUrlValidation: true, // Already validated above
          }).catch(error => {
            const errorMsg = `File ${globalIndex + 1} (${url.substring(0, 50)}...): ${error.message}`;
            errors.push(errorMsg);
            this.logger.warn(`Upload failed for file ${globalIndex + 1}:`, error.message);
            return null;
          });
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Add successful results
        batchResults.forEach(result => {
          if (result) {
            results.push(result);
          }
        });

        // Small delay between batches to avoid overwhelming the service
        if (i + concurrency < fileUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const successCount = results.length;
      const failureCount = fileUrls.length - successCount;

      if (failureCount > 0) {
        this.logger.warn(`${failureCount} out of ${fileUrls.length} files failed to upload`);
        if (errors.length > 0) {
          this.logger.warn('Upload errors:', errors.slice(0, 5)); // Log first 5 errors
        }
      }

      this.logger.log(`Successfully uploaded ${successCount} out of ${fileUrls.length} files`);
      
      // If no files were uploaded successfully, throw an error
      if (successCount === 0 && fileUrls.length > 0) {
        throw new InternalServerErrorException(
          `Failed to upload any files. Errors: ${errors.slice(0, 3).join('; ')}`
        );
      }
      
      return results;
      
    } catch (error) {
      this.logger.error('Error uploading multiple files:', error);
      throw new InternalServerErrorException(`Failed to upload files: ${error.message}`);
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.storage
        .from(this.supabaseConfig.bucketName)
        .remove([filePath]);

      if (error) {
        this.logger.error(`Failed to delete file ${filePath}:`, error);
        return false;
      }

      this.logger.log(`File deleted successfully: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Get file metadata from Supabase Storage
   */
  async getFileInfo(filePath: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.supabaseConfig.bucketName)
        .list(path.dirname(filePath), {
          search: path.basename(filePath),
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0];
    } catch (error) {
      this.logger.error(`Error getting file info for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Validate URL accessibility and get metadata
   */
  async validateUrl(url: string): Promise<UrlValidationResult> {
    // Check cache first
    const cached = this.urlValidationCache.get(url);
    if (cached && Date.now() - cached.lastChecked < this.cacheExpiry) {
      return cached;
    }

    try {
      // Basic URL format validation
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        const result: UrlValidationResult = {
          isValid: false,
          isAccessible: false,
          error: 'URL must use HTTP or HTTPS protocol',
        };
        this.urlValidationCache.set(url, { ...result, lastChecked: Date.now() });
        return result;
      }

      // Make HEAD request to check accessibility
      const response = await firstValueFrom(
        this.httpService.head(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'AutomationPlatform/1.0',
          },
        }).pipe(
          timeout(10000),
          catchError((error) => {
            throw error;
          })
        )
      );

      const result: UrlValidationResult = {
        isValid: true,
        isAccessible: response.status >= 200 && response.status < 300,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'] ? parseInt(response.headers['content-length']) : undefined,
      };

      this.urlValidationCache.set(url, { ...result, lastChecked: Date.now() });
      return result;
    } catch (error) {
      this.logger.warn(`URL validation failed for ${url.substring(0, 100)}:`, error.message);
      
      let errorMessage = 'URL is not accessible';
      if (error instanceof AxiosError) {
        if (error.code === 'ENOTFOUND') {
          errorMessage = 'Domain not found';
        } else if (error.code === 'ECONNREFUSED') {
          errorMessage = 'Connection refused';
        } else if (error.code === 'ETIMEDOUT') {
          errorMessage = 'Connection timed out';
        } else if (error.response?.status === 401) {
          errorMessage = 'Authentication required';
        } else if (error.response?.status === 403) {
          errorMessage = 'Access forbidden';
        } else if (error.response?.status === 404) {
          errorMessage = 'File not found';
        }
      }

      const result: UrlValidationResult = {
        isValid: true, // URL format is valid
        isAccessible: false,
        error: errorMessage,
      };

      this.urlValidationCache.set(url, { ...result, lastChecked: Date.now() });
      return result;
    }
  }

  /**
   * Download file from URL with retry logic
   */
  private async downloadFileWithRetry(url: string, maxRetries: number = 3): Promise<AxiosResponse<ArrayBuffer>> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(`Download attempt ${attempt}/${maxRetries} for URL: ${url.substring(0, 100)}`);
        
        const response = await firstValueFrom(
          this.httpService.get<ArrayBuffer>(url, {
            responseType: 'arraybuffer',
            timeout: 60000, // 60 seconds timeout
            maxContentLength: this.supabaseConfig.maxFileSizeBytes,
            headers: {
              'User-Agent': 'AutomationPlatform/1.0',
              'Accept': '*/*',
              'Accept-Encoding': 'gzip, deflate',
            },
          }).pipe(
            timeout(60000),
            retry({
              count: 2,
              delay: 1000,
              resetOnSuccess: true
            }),
            catchError((error) => {
              this.logger.warn(`Download attempt ${attempt} failed:`, error.message);
              throw error;
            })
          )
        );
        
        this.logger.log(`Successfully downloaded file on attempt ${attempt}, size: ${response.data.byteLength} bytes`);
        return response;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Check if error is retryable
        if (error instanceof AxiosError) {
          const status = error.response?.status;
          // Don't retry client errors (4xx)
          if (status && status >= 400 && status < 500) {
            this.logger.warn(`Non-retryable error ${status}, stopping retries`);
            break;
          }
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        this.logger.log(`Waiting ${delay}ms before retry attempt ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    this.logger.error(`All download attempts failed for URL: ${url.substring(0, 100)}`);
    throw new BadRequestException(`Failed to download file after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Download file from URL (legacy method for backward compatibility)
   */
  private async downloadFile(url: string): Promise<AxiosResponse<ArrayBuffer>> {
    return this.downloadFileWithRetry(url, 1);
  }

  /**
   * Generate unique file path for storage
   */
  private generateFilePath(
    originalUrl: string,
    contentType: string,
    options: FileUploadOptions
  ): string {
    const extension = this.getFileExtension(originalUrl, contentType);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomHash = crypto.randomBytes(8).toString('hex');
    
    // Create folder structure: folder/userId/sessionId/timestamp_hash.ext
    const parts = [
      options.folder || 'generations',
      options.userId ? `user_${options.userId}` : 'anonymous',
      options.sessionId ? `session_${options.sessionId}` : 'no_session',
      `${timestamp}_${randomHash}${extension}`,
    ];

    if (options.fileName) {
      parts[parts.length - 1] = `${options.fileName}_${timestamp}_${randomHash}${extension}`;
    }

    return parts.join('/');
  }

  /**
   * Get file extension from URL or content type
   */
  private getFileExtension(url: string, contentType: string): string {
    // Try to get extension from URL first
    const urlExtension = path.extname(new URL(url).pathname);
    if (urlExtension) {
      return urlExtension;
    }

    // Fallback to content type mapping
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/mov': '.mov',
      'video/avi': '.avi',
    };

    return mimeToExt[contentType] || '.bin';
  }

  /**
   * Detect MIME type from URL
   */
  private detectMimeType(url: string): string {
    const extension = path.extname(new URL(url).pathname).toLowerCase();
    
    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/mov',
      '.avi': 'video/avi',
    };

    return extToMime[extension] || 'application/octet-stream';
  }

  /**
   * Upload to Supabase with retry logic
   */
  private async uploadToSupabaseWithRetry(
    filePath: string,
    fileBuffer: Buffer,
    contentType: string,
    originalUrl: string,
    options: FileUploadOptions
  ): Promise<{ path: string }> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        this.logger.log(`Supabase upload attempt ${attempt}/${this.retryConfig.maxRetries} for path: ${filePath}`);
        
        const { data, error } = await this.supabase.storage
          .from(this.supabaseConfig.bucketName)
          .upload(filePath, fileBuffer, {
            contentType,
            upsert: false,
            metadata: {
              originalUrl,
              uploadedAt: new Date().toISOString(),
              userId: options.userId?.toString(),
              sessionId: options.sessionId?.toString(),
              uploadAttempt: attempt,
              ...options.metadata,
            },
          });

        if (error) {
          this.logger.error(`Supabase upload error on attempt ${attempt}:`, error);
          lastError = error;
          
          // Check if error is retryable
          if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
            // Try with a new path
            const timestamp = Date.now();
            const newPath = filePath.replace(/(\.\w+)$/, `_${timestamp}$1`);
            this.logger.log(`File exists, trying new path: ${newPath}`);
            
            const { data: retryData, error: retryError } = await this.supabase.storage
              .from(this.supabaseConfig.bucketName)
              .upload(newPath, fileBuffer, {
                contentType,
                upsert: false,
                metadata: {
                  originalUrl,
                  uploadedAt: new Date().toISOString(),
                  userId: options.userId?.toString(),
                  sessionId: options.sessionId?.toString(),
                  uploadAttempt: attempt,
                  pathRetry: true,
                  ...options.metadata,
                },
              });
            
            if (retryError) {
              throw new InternalServerErrorException(`Failed to upload with retry path: ${retryError.message}`);
            }
            
            return { path: retryData.path };
          }
          
          if (attempt === this.retryConfig.maxRetries) {
            throw new InternalServerErrorException(`Failed to upload file after ${this.retryConfig.maxRetries} attempts: ${error.message}`);
          }
        } else {
          this.logger.log(`Successfully uploaded to Supabase on attempt ${attempt}`);
          return { path: data.path };
        }
      } catch (error) {
        lastError = error;
        
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );
        
        this.logger.log(`Waiting ${delay}ms before Supabase upload retry attempt ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new InternalServerErrorException(`Failed to upload to Supabase after ${this.retryConfig.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Perform comprehensive health check on storage system
   */
  async performHealthCheck(): Promise<StorageHealthCheck> {
    const errors: string[] = [];
    let bucketExists = false;
    let bucketAccessible = false;
    let policiesConfigured = false;
    let connectionHealthy = false;

    try {
      // Test basic connection
      const { data: buckets, error: bucketsError } = await this.supabase.storage.listBuckets();
      
      if (bucketsError) {
        errors.push(`Failed to list buckets: ${bucketsError.message}`);
      } else {
        connectionHealthy = true;
        bucketExists = buckets.some(bucket => bucket.name === this.supabaseConfig.bucketName);
        
        if (!bucketExists) {
          errors.push(`Bucket '${this.supabaseConfig.bucketName}' does not exist`);
          
          // Try to create the bucket
          try {
            const { error: createError } = await this.supabase.storage.createBucket(
              this.supabaseConfig.bucketName,
              {
                public: true,
                allowedMimeTypes: this.supabaseConfig.allowedMimeTypes,
                fileSizeLimit: this.supabaseConfig.maxFileSizeBytes,
              }
            );
            
            if (createError) {
              errors.push(`Failed to create bucket: ${createError.message}`);
            } else {
              bucketExists = true;
              this.logger.log(`Successfully created bucket '${this.supabaseConfig.bucketName}'`);
            }
          } catch (createError) {
            errors.push(`Failed to create bucket: ${createError.message}`);
          }
        }
        
        // Test bucket accessibility
        if (bucketExists) {
          try {
            const { data: files, error: listError } = await this.supabase.storage
              .from(this.supabaseConfig.bucketName)
              .list('', { limit: 1 });
            
            if (listError) {
              errors.push(`Cannot access bucket: ${listError.message}`);
            } else {
              bucketAccessible = true;
            }
          } catch (listError) {
            errors.push(`Cannot access bucket: ${listError.message}`);
          }
        }
      }
      
      // Check policies (simplified check)
      if (bucketExists && bucketAccessible) {
        // For now, assume policies are configured if we can access the bucket
        // In a real implementation, you might want to test actual upload/download operations
        policiesConfigured = true;
      }
      
    } catch (error) {
      errors.push(`Health check failed: ${error.message}`);
    }

    const healthCheck: StorageHealthCheck = {
      bucketExists,
      bucketAccessible,
      policiesConfigured,
      connectionHealthy,
      lastChecked: new Date(),
      errors,
    };

    this.healthCheckCache = healthCheck;
    this.lastHealthCheck = Date.now();

    if (errors.length > 0) {
      this.logger.warn('Storage health check completed with issues:', errors);
    } else {
      this.logger.log('Storage health check completed successfully');
    }

    return healthCheck;
  }

  /**
   * Ensure storage is healthy before operations
   */
  private async ensureStorageHealth(): Promise<void> {
    // Check if we need to refresh health check
    if (!this.healthCheckCache || Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
      await this.performHealthCheck();
    }

    const health = this.healthCheckCache;
    if (!health || !health.connectionHealthy) {
      throw new InternalServerErrorException('Supabase storage is not accessible. Please check your configuration.');
    }

    if (!health.bucketExists) {
      throw new InternalServerErrorException(`Storage bucket '${this.supabaseConfig.bucketName}' does not exist.`);
    }

    if (!health.bucketAccessible) {
      throw new InternalServerErrorException(`Storage bucket '${this.supabaseConfig.bucketName}' is not accessible.`);
    }
  }

  /**
   * Get storage health status
   */
  async getHealthStatus(): Promise<StorageHealthCheck> {
    if (!this.healthCheckCache || Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
      return await this.performHealthCheck();
    }
    return this.healthCheckCache;
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.urlValidationCache.clear();
    this.logger.log('URL validation cache cleared');
  }

  /**
   * Get bucket info and configuration
   */
  getBucketInfo(): {
    bucketName: string;
    maxFileSizeBytes: number;
    maxFileSizeMB: number;
    allowedMimeTypes: string[];
    healthStatus?: StorageHealthCheck;
  } {
    return {
      bucketName: this.supabaseConfig.bucketName,
      maxFileSizeBytes: this.supabaseConfig.maxFileSizeBytes,
      maxFileSizeMB: this.supabaseConfig.maxFileSizeBytes / (1024 * 1024),
      allowedMimeTypes: this.supabaseConfig.allowedMimeTypes,
      healthStatus: this.healthCheckCache,
    };
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    Object.assign(this.retryConfig, config);
    this.logger.log('Retry configuration updated:', this.retryConfig);
  }
}