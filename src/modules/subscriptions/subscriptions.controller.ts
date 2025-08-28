import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Headers,
  RawBody,
  Logger,
  Patch,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

import {
  StripeService,
  WebhookService,
} from '@/modules/subscriptions/services';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
  CancelSubscriptionDto,
  ResumeSubscriptionDto,
  SubscriptionActionResponseDto,
} from '@/modules/subscriptions/dto';
import { HybridAuthGuard } from '@/modules/auth/guards';
import { AuthUser, HybridAuth } from '@/modules/auth/decorators';
import { AuthUserDto } from '@/modules/auth/dto';
import { UserPackageResponseDto } from '@/modules/packages/dto';
import { PackagesService, UserPackagesRepository } from '@/modules/packages';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly webhookService: WebhookService,
    private readonly packagesService: PackagesService,
    private readonly userPackagesRepository: UserPackagesRepository,
  ) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Create checkout session',
    description: 'Create a Stripe checkout session for subscription purchase',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or package not found',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async createCheckoutSession(
    @AuthUser() user: AuthUserDto,
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    this.logger.log(`Creating checkout session for user: ${user.user_id}`);

    const result = await this.stripeService.createCheckoutSession(
      user.user_id,
      {
        packageId: createCheckoutSessionDto.packageId,
        billingInterval: createCheckoutSessionDto.billingInterval,
        successUrl: createCheckoutSessionDto.successUrl,
        cancelUrl: createCheckoutSessionDto.cancelUrl,
      },
      user.email,
      user.name,
    );

    return {
      sessionId: result.sessionId,
      url: result.url,
      customerId: result.customerId,
    };
  }

  @Post('portal')
  @ApiOperation({
    summary: 'Create customer portal session',
    description:
      'Create a Stripe customer portal session for subscription management',
  })
  @ApiResponse({
    status: 201,
    description: 'Portal session created successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Customer portal URL',
          example: 'https://billing.stripe.com/p/session/abc123',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async createPortalSession(
    @AuthUser() user: AuthUserDto,
    @Body() body?: { returnUrl?: string },
  ) {
    this.logger.log(`Creating portal session for user: ${user.user_id}`);

    // Use a default return URL if not provided
    const returnUrl =
      body?.returnUrl ||
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;

    // Get user's current subscription to find customer ID
    const userPackage = await this.packagesService.getUserCurrentPackage(
      user.user_id,
    );

    if (!userPackage || !userPackage.stripe_customer_id) {
      return { error: 'No active subscription found' };
    }

    const session = await this.stripeService.createPortalSession(
      userPackage.stripe_customer_id,
      returnUrl,
    );

    return { url: session.url };
  }

  @Patch('cancel')
  @ApiOperation({
    summary: 'Cancel subscription',
    description: "Cancel the current user's active subscription",
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription cancelled successfully',
    type: SubscriptionActionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async cancelSubscription(
    @AuthUser() user: AuthUserDto,
    @Body() cancelSubscriptionDto: CancelSubscriptionDto,
  ): Promise<SubscriptionActionResponseDto> {
    this.logger.log(`Cancelling subscription for user: ${user.user_id}`);
    this.logger.log(`Request body: ${JSON.stringify(cancelSubscriptionDto)}`);

    // Get user's current subscription
    const userPackage = await this.packagesService.getUserCurrentPackage(
      user.user_id,
    );

    if (!userPackage || !userPackage.stripe_subscription_id) {
      return {
        success: false,
        message: 'No active subscription found',
      };
    }

    const stripeSubscription = await this.stripeService.cancelSubscription(
      userPackage.stripe_subscription_id,
      cancelSubscriptionDto.cancelImmediately,
    );

    this.logger.log(`cancelImmediately value: ${cancelSubscriptionDto.cancelImmediately}`);
    this.logger.log(`cancelImmediately type: ${typeof cancelSubscriptionDto.cancelImmediately}`);

    // Immediately update the database to reflect the cancellation status
    // This ensures the UI shows the correct status without waiting for webhooks
    if (!cancelSubscriptionDto.cancelImmediately) {
      this.logger.log('Updating cancel_at_period_end to true');
      await this.userPackagesRepository.update(userPackage.id, {
        cancel_at_period_end: true,
      });
      this.logger.log(`Updated cancel_at_period_end flag for user package: ${userPackage.id}`);
    } else {
      this.logger.log('Skipping cancel_at_period_end update because cancelImmediately is true');
    }

    const effectiveDate = cancelSubscriptionDto.cancelImmediately
      ? new Date()
      : new Date((stripeSubscription as any).current_period_end * 1000);

    return {
      success: true,
      message: cancelSubscriptionDto.cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of the current billing period',
      status: stripeSubscription.status,
      effectiveDate,
    };
  }

  @Patch('resume')
  @ApiOperation({
    summary: 'Resume subscription',
    description: 'Resume a cancelled subscription (remove cancellation)',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription resumed successfully',
    type: SubscriptionActionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No subscription found to resume',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async resumeSubscription(
    @AuthUser() user: AuthUserDto,
    @Body() resumeSubscriptionDto: ResumeSubscriptionDto,
  ): Promise<SubscriptionActionResponseDto> {
    this.logger.log(`Resuming subscription for user: ${user.user_id}`);

    // Get user's current subscription
    const userPackage = await this.packagesService.getUserCurrentPackage(
      user.user_id,
    );

    if (!userPackage || !userPackage.stripe_subscription_id) {
      return {
        success: false,
        message: 'No subscription found to resume',
      };
    }

    const stripeSubscription = await this.stripeService.resumeSubscription(
      userPackage.stripe_subscription_id,
    );



    // Immediately update the database to clear the cancellation flag
    // This ensures the UI shows the correct status without waiting for webhooks
    await this.userPackagesRepository.update(userPackage.id, {
      cancel_at_period_end: false,
    });
    this.logger.log(`Cleared cancel_at_period_end flag for user package: ${userPackage.id}`);

    return {
      success: true,
      message: 'Subscription resumed successfully',
      status: stripeSubscription.status,
    };
  }


  @Get('upcoming-invoice')
  @ApiOperation({
    summary: 'Get upcoming invoice',
    description: "Get the upcoming invoice for the user's subscription",
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming invoice retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        amount_due: { type: 'number', description: 'Amount due in cents' },
        amount_paid: {
          type: 'number',
          description: 'Amount already paid in cents',
        },
        currency: { type: 'string', description: 'Currency code' },
        created: { type: 'number', description: 'Creation timestamp' },
        period_start: {
          type: 'number',
          description: 'Billing period start timestamp',
        },
        period_end: {
          type: 'number',
          description: 'Billing period end timestamp',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'No active subscription found',
  })
  @ApiBearerAuth('ApiKey')
  @ApiBearerAuth('SupabaseToken')
  @HybridAuth()
  async getUpcomingInvoice(@AuthUser() user: AuthUserDto) {
    this.logger.log(`Getting upcoming invoice for user: ${user.user_id}`);

    // Get user's current subscription
    const userPackage = await this.packagesService.getUserCurrentPackage(
      user.user_id,
    );

    if (!userPackage || !userPackage.stripe_subscription_id) {
      return { error: 'No active subscription found' };
    }

    const invoice = await this.stripeService.getUpcomingInvoice(
      userPackage.stripe_subscription_id,
    );

    return {
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      created: invoice.created,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      lines: invoice.lines.data.map((line) => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
        period: {
          start: line.period?.start,
          end: line.period?.end,
        },
      })),
    };
  }

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<void> {
    try {
      console.log('Headers:', req.headers);
      console.log('Signature:', signature);
      console.log('Raw body length:', rawBody?.length);
      console.log('Raw body type:', typeof rawBody);
      
      const event = this.stripeService.constructWebhookEvent(
        rawBody,
        signature,
      );

      this.logger.log(`Received Stripe webhook: ${event.type} (${event.id})`);

      // Process the webhook event asynchronously
      await this.webhookService.processWebhookEvent({
        id: event.id,
        type: event.type,
        data: event.data,
        created: event.created,
      });

      response.status(200).json({ received: true });
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      response
        .status(400)
        .json({ error: 'Webhook signature verification failed' });
    }
  }
}
