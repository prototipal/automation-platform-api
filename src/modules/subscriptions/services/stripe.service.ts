import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { PackagesService } from '@/modules/packages';
import { BillingInterval, SubscriptionStatus } from '@/modules/packages/enums';
import {
  CreateCheckoutSessionRequest,
  CheckoutSessionResponse,
  SubscriptionEventData,
} from '@/modules/subscriptions/interfaces';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly packagesService: PackagesService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-07-30.basil',
    });
  }

  /**
   * Create Stripe customer for user
   */
  async createCustomer(userId: string, email?: string, name?: string): Promise<Stripe.Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          user_id: userId,
        },
      });

      this.logger.log(`Stripe customer created: ${customer.id} for user: ${userId}`);
      return customer;
    } catch (error) {
      this.logger.error(`Failed to create Stripe customer for user ${userId}:`, error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Get or create Stripe customer
   */
  async getOrCreateCustomer(
    userId: string,
    email?: string,
    name?: string,
    existingCustomerId?: string
  ): Promise<Stripe.Customer> {
    if (existingCustomerId) {
      try {
        const customer = await this.stripe.customers.retrieve(existingCustomerId);
        if (!customer.deleted) {
          return customer as Stripe.Customer;
        }
      } catch (error) {
        this.logger.warn(`Failed to retrieve existing customer ${existingCustomerId}:`, error);
      }
    }

    // Search for existing customer by user_id in metadata
    const existingCustomers = await this.stripe.customers.list({
      limit: 1,
      expand: ['data'],
    });

    const existingCustomer = existingCustomers.data.find(
      customer => customer.metadata?.user_id === userId
    );

    if (existingCustomer) {
      this.logger.log(`Found existing Stripe customer: ${existingCustomer.id} for user: ${userId}`);
      return existingCustomer;
    }

    return this.createCustomer(userId, email, name);
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    request: CreateCheckoutSessionRequest,
    userEmail?: string,
    userName?: string
  ): Promise<CheckoutSessionResponse> {
    try {
      // Get package details
      const package_ = await this.packagesService.findPackageById(request.packageId);
      
      // Determine the correct price ID based on billing interval
      let priceId: string;
      if (request.billingInterval === BillingInterval.YEAR) {
        priceId = package_.stripe_yearly_price_id;
      } else {
        priceId = package_.stripe_monthly_price_id;
      }

      if (!priceId) {
        throw new BadRequestException(
          `No Stripe price ID configured for ${request.billingInterval} billing of package ${package_.name}`
        );
      }

      // Get or create customer
      const customer = await this.getOrCreateCustomer(
        userId,
        userEmail,
        userName,
        request.customerId
      );

      // Secure URL handling - use environment defaults if not provided
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const successUrl = request.successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = request.cancelUrl || `${baseUrl}/subscription/cancelled`;

      // Create checkout session
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          package_id: request.packageId.toString(),
          billing_interval: request.billingInterval,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
            package_id: request.packageId.toString(),
            billing_interval: request.billingInterval,
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_update: {
          name: 'auto',
          address: 'auto',
        },
        tax_id_collection: {
          enabled: true,
        },
      };


      const session = await this.stripe.checkout.sessions.create(sessionParams);

      this.logger.log(
        `Checkout session created: ${session.id} for user: ${userId}, package: ${package_.name}`
      );

      return {
        sessionId: session.id,
        url: session.url!,
        customerId: customer.id,
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout session:`, error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to create checkout session');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    stripeSubscriptionId: string,
    cancelImmediately: boolean = false
  ): Promise<Stripe.Subscription> {
    try {
      if (cancelImmediately) {
        const subscription = await this.stripe.subscriptions.cancel(stripeSubscriptionId);
        this.logger.log(`Subscription cancelled immediately: ${stripeSubscriptionId}`);
        return subscription;
      } else {
        const subscription = await this.stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        this.logger.log(`Subscription marked for cancellation at period end: ${stripeSubscriptionId}`);
        return subscription;
      }
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${stripeSubscriptionId}:`, error);
      throw new BadRequestException('Failed to cancel subscription');
    }
  }

  /**
   * Resume subscription (remove cancellation)
   */
  async resumeSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      
      this.logger.log(`Subscription resumed: ${stripeSubscriptionId}`);
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to resume subscription ${stripeSubscriptionId}:`, error);
      throw new BadRequestException('Failed to resume subscription');
    }
  }

  /**
   * Retrieve subscription details
   */
  async getSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.retrieve(stripeSubscriptionId, {
        expand: ['latest_invoice', 'customer'],
      });
    } catch (error) {
      this.logger.error(`Failed to retrieve subscription ${stripeSubscriptionId}:`, error);
      throw new NotFoundException('Subscription not found');
    }
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(
    stripeCustomerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });

      this.logger.log(`Portal session created for customer: ${stripeCustomerId}`);
      return session;
    } catch (error) {
      this.logger.error(`Failed to create portal session for customer ${stripeCustomerId}:`, error);
      throw new BadRequestException('Failed to create portal session');
    }
  }

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Failed to construct webhook event:', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Map Stripe subscription status to our enum
   */
  mapSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
      'active': SubscriptionStatus.ACTIVE,
      'trialing': SubscriptionStatus.TRIALING,
      'past_due': SubscriptionStatus.PAST_DUE,
      'canceled': SubscriptionStatus.CANCELLED,
      'unpaid': SubscriptionStatus.UNPAID,
      'incomplete': SubscriptionStatus.INACTIVE,
      'incomplete_expired': SubscriptionStatus.CANCELLED,
    };

    return statusMap[stripeStatus] || SubscriptionStatus.INACTIVE;
  }

  /**
   * Extract billing interval from Stripe subscription
   */
  getBillingInterval(subscription: SubscriptionEventData): BillingInterval {
    const interval = subscription.items.data[0]?.price?.recurring?.interval;
    return interval === 'year' ? BillingInterval.YEAR : BillingInterval.MONTH;
  }

  /**
   * Get upcoming invoice for subscription
   */
  async getUpcomingInvoice(stripeSubscriptionId: string): Promise<Stripe.Invoice> {
    try {
      // Using dynamic access for compatibility across Stripe versions
      return await (this.stripe.invoices as any).retrieveUpcoming({
        subscription: stripeSubscriptionId,
      });
    } catch (error) {
      this.logger.error(`Failed to retrieve upcoming invoice for subscription ${stripeSubscriptionId}:`, error);
      throw new BadRequestException('Failed to retrieve upcoming invoice');
    }
  }
}