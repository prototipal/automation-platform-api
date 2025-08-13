import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { StorageService } from '@/modules/storage';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  getHello(): object {
    return {
      message: 'Automation Platform API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/health',
      storage: '/api/storage/health'
    };
  }

  @Get('health')
  async getHealth(): Promise<object> {
    try {
      const storageHealth = await this.storageService.getHealthStatus();
      const bucketInfo = this.storageService.getBucketInfo();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        storage: {
          healthy: storageHealth.connectionHealthy && storageHealth.bucketExists && storageHealth.bucketAccessible,
          bucket: {
            name: bucketInfo.bucketName,
            exists: storageHealth.bucketExists,
            accessible: storageHealth.bucketAccessible,
            maxSizeMB: bucketInfo.maxFileSizeMB,
            allowedTypes: bucketInfo.allowedMimeTypes.length,
          },
          lastChecked: storageHealth.lastChecked,
          errors: storageHealth.errors,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
