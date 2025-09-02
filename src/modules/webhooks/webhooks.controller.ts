import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Public } from '@/modules/auth/decorators';
import { ReplicateWebhookService } from './services';
import { ReplicateWebhookDto, WebhookResponseDto } from './dto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly replicateWebhookService: ReplicateWebhookService,
  ) {}

  @Public()
  @Post('replicate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Replicate webhook events',
    description: 'Processes webhook events from Replicate API for video generation callbacks',
  })
  @ApiHeader({
    name: 'replicate-signature',
    description: 'HMAC-SHA256 signature for webhook verification',
    required: false,
  })
  @ApiHeader({
    name: 'replicate-timestamp',
    description: 'Unix timestamp when webhook was sent',
    required: false,
  })
  @ApiBody({
    type: ReplicateWebhookDto,
    description: 'Replicate webhook payload',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload or signature',
  })
  @ApiResponse({
    status: 401,
    description: 'Webhook signature verification failed',
  })
  async handleReplicateWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('replicate-signature') signature?: string,
    @Headers('replicate-timestamp') timestamp?: string,
    @Body() body?: any,
  ): Promise<WebhookResponseDto> {
    const startTime = Date.now();
    
    try {
      // Get raw body for signature verification
      const rawBody = req.rawBody ? req.rawBody.toString() : JSON.stringify(body);
      
      this.logger.log(`Received Replicate webhook: ${body?.id || 'unknown'}`);
      
      // DEBUG: Log the complete payload structure
      this.logger.debug('Webhook payload received:', {
        body: JSON.stringify(body, null, 2),
        bodyKeys: Object.keys(body || {}),
        bodyType: typeof body,
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        rawBodyLength: rawBody?.length || 0,
      });

      // Verify webhook signature if headers are present
      if (signature && timestamp) {
        const isValid = this.replicateWebhookService.verifyWebhookSignature(
          rawBody,
          signature,
          timestamp,
        );

        if (!isValid) {
          this.logger.warn('Webhook signature verification failed');
          throw new UnauthorizedException('Webhook signature verification failed');
        }

        this.logger.debug('Webhook signature verified successfully');
      } else {
        this.logger.warn('Webhook received without signature headers');
      }

      // Skip validation temporarily to see the payload structure
      if (!body || typeof body !== 'object') {
        this.logger.error('Invalid webhook body type:', typeof body);
        throw new BadRequestException('Webhook body must be an object');
      }

      // For now, just log what we received and return success
      this.logger.log('Webhook body analysis:', {
        hasId: !!body.id,
        hasStatus: !!body.status,
        hasModel: !!body.model,
        hasOutput: !!body.output,
        allKeys: Object.keys(body),
      });

      // Try to process with minimal validation for debugging
      try {
        if (body.id && body.status) {
          await this.replicateWebhookService.processWebhookEvent(body);
        } else {
          this.logger.warn('Webhook missing required fields (id or status)');
        }
      } catch (processError) {
        this.logger.error('Error processing webhook:', processError);
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Webhook processed successfully for prediction: ${body?.id || 'unknown'} in ${processingTime}ms`,
      );

      return {
        status: 'success',
        message: 'Webhook processed successfully (debug mode)',
        prediction_id: body?.id || 'unknown',
        processed_at: new Date().toISOString(),
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        // Re-throw validation and authorization errors
        throw error;
      }

      // Log the error but don't expose internal details
      this.logger.error(
        `Webhook processing failed for prediction: ${body?.id || 'unknown'} after ${processingTime}ms:`,
        error,
      );

      return {
        status: 'error',
        message: 'Internal error processing webhook',
        prediction_id: body?.id || 'unknown',
        processed_at: new Date().toISOString(),
      };
    }
  }

  @Public()
  @Post('replicate/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test endpoint for webhook development',
    description: 'Test endpoint to validate webhook payload structure during development',
  })
  @ApiResponse({
    status: 200,
    description: 'Test webhook received',
  })
  async testWebhook(
    @Body() body: any,
    @Headers() headers: Record<string, string>,
  ): Promise<any> {
    this.logger.debug('Test webhook received:', {
      body: JSON.stringify(body, null, 2),
      headers: {
        'content-type': headers['content-type'],
        'replicate-signature': headers['replicate-signature'],
        'replicate-timestamp': headers['replicate-timestamp'],
      },
    });

    return {
      message: 'Test webhook received successfully',
      received_at: new Date().toISOString(),
      body_keys: Object.keys(body || {}),
      has_signature: !!headers['replicate-signature'],
      has_timestamp: !!headers['replicate-timestamp'],
    };
  }
}