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
      // Parse the raw body if it's a Buffer
      let parsedBody: any;
      let rawBodyString: string;

      if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
        // Convert Buffer to string
        rawBodyString = req.rawBody.toString('utf8');
        try {
          parsedBody = JSON.parse(rawBodyString);
          this.logger.log(`Successfully parsed webhook JSON for prediction: ${parsedBody.id || 'unknown'}`);
        } catch (parseError) {
          this.logger.error('Failed to parse webhook JSON:', parseError);
          throw new BadRequestException('Invalid JSON payload');
        }
      } else if (body && typeof body === 'object' && !Array.isArray(body)) {
        // Use the parsed body from NestJS
        parsedBody = body;
        rawBodyString = JSON.stringify(body);
      } else {
        this.logger.error('No valid body found in webhook request');
        throw new BadRequestException('No valid payload found');
      }
      
      this.logger.log(`Received Replicate webhook: ${parsedBody?.id || 'unknown'}`);
      
      // DEBUG: Log the parsed payload structure
      this.logger.debug('Webhook payload parsed:', {
        id: parsedBody.id,
        status: parsedBody.status,
        model: parsedBody.model,
        hasOutput: !!parsedBody.output,
        outputType: typeof parsedBody.output,
        allKeys: Object.keys(parsedBody || {}),
      });

      // Verify webhook signature if headers are present
      if (signature && timestamp) {
        const isValid = this.replicateWebhookService.verifyWebhookSignature(
          rawBodyString,
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

      // Validate required fields
      if (!parsedBody.id || !parsedBody.status) {
        this.logger.error('Webhook missing required fields (id or status)');
        throw new BadRequestException('Webhook payload missing required fields: id, status');
      }

      // Process the webhook
      await this.replicateWebhookService.processWebhookEvent(parsedBody);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Webhook processed successfully for prediction: ${parsedBody?.id || 'unknown'} in ${processingTime}ms`,
      );

      return {
        status: 'success',
        message: 'Webhook processed successfully',
        prediction_id: parsedBody?.id || 'unknown',
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
        `Webhook processing failed for prediction: unknown after ${processingTime}ms:`,
        error,
      );

      return {
        status: 'error',
        message: 'Internal error processing webhook',
        prediction_id: 'unknown',
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