import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';

import { StripeService } from './stripe.service';
import { PackagesService, UserPackagesRepository } from '@/modules/packages';
import { SubscriptionStatus, BillingInterval } from '@/modules/packages/enums';
import {
  StripeWebhookEvent,
  SubscriptionEventData,
  CustomerEventData,
  InvoiceEventData,
} from '@/modules/subscriptions/interfaces';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly packagesService: PackagesService,
    private readonly userPackagesRepository: UserPackagesRepository,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process Stripe webhook event
   */
  async processWebhookEvent(event: StripeWebhookEvent): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        // Subscription events
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object as SubscriptionEventData,
          );
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object as SubscriptionEventData,
          );
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object as SubscriptionEventData,
          );
          break;

        // Checkout session events
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(event.data.object);
          break;

        // Invoice events
        case 'invoice.payment_succeeded':
        case 'invoice.paid':
          await this.handleInvoicePaymentSucceeded(
            event.data.object as InvoiceEventData,
          );
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(
            event.data.object as InvoiceEventData,
          );
          break;

        case 'invoice.created':
        case 'invoice.finalized':
          // These events don't require special handling in our current flow
          this.logger.debug(`Invoice event processed: ${event.type}`);
          break;

        // Customer events
        case 'customer.created':
        case 'customer.updated':
          await this.handleCustomerUpdated(
            event.data.object as CustomerEventData,
          );
          break;

        default:
          this.logger.debug(`Unhandled webhook event type: ${event.type}`);
      }

      this.logger.log(
        `Successfully processed webhook event: ${event.type} (${event.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process webhook event ${event.type} (${event.id}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(
    subscription: SubscriptionEventData,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userId = subscription.metadata?.user_id;
      const packageId = subscription.metadata?.package_id;

      if (!userId || !packageId) {
        this.logger.warn(
          `Missing metadata in subscription ${subscription.id}: userId=${userId}, packageId=${packageId}`,
        );
        return;
      }

      // Cancel any existing active subscriptions for this customer
      if (subscription.customer) {
        try {
          await this.stripeService.cancelAllActiveSubscriptionsForCustomer(
            subscription.customer as string,
            subscription.id, // Exclude the new subscription
          );
        } catch (error) {
          this.logger.warn(
            `Failed to cancel existing subscriptions for customer ${subscription.customer}:`,
            error,
          );
        }
      }

      const billingInterval =
        this.stripeService.getBillingInterval(subscription);
      const status = this.stripeService.mapSubscriptionStatus(
        subscription.status,
      );

      // Create user package subscription
      await this.packagesService.assignPackageToUser(
        userId,
        parseInt(packageId),
        subscription.id,
        subscription.customer,
        billingInterval,
        subscription.trial_start
          ? new Date(subscription.trial_start * 1000)
          : undefined,
        subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : undefined,
      );

      // Get package details for credit management
      const packageDetails = await this.packagesService.findPackageById(
        parseInt(packageId),
      );

      await queryRunner.commitTransaction();

      // Emit event for other services to react
      this.eventEmitter.emit('subscription.created', {
        userId,
        packageId: parseInt(packageId),
        subscriptionId: subscription.id,
        status,
        packageName: packageDetails?.name || 'Unknown Package',
        monthlyCredits: packageDetails?.monthly_credits || 0,
        hasTrialPeriod: !!subscription.trial_end,
      });

      this.logger.log(
        `Subscription created: ${subscription.id} for user: ${userId}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to handle subscription created event:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(
    subscription: SubscriptionEventData,
  ): Promise<void> {
    const userPackage =
      await this.userPackagesRepository.findByStripeSubscriptionId(
        subscription.id,
      );

    if (!userPackage) {
      this.logger.warn(
        `UserPackage not found for subscription: ${subscription.id}`,
      );
      return;
    }

    const status = this.stripeService.mapSubscriptionStatus(
      subscription.status,
    );
    const billingInterval = this.stripeService.getBillingInterval(subscription);

    const updateData: Partial<any> = {
      status,
      billing_interval: billingInterval,
      current_period_start: new Date(
        (subscription as any).current_period_start * 1000,
      ),
      current_period_end: new Date(
        (subscription as any).current_period_end * 1000,
      ),
      cancel_at_period_end: subscription.cancel_at_period_end,
    };

    if (subscription.canceled_at) {
      updateData.cancelled_at = new Date(subscription.canceled_at * 1000);
    }

    if (subscription.trial_start) {
      updateData.trial_start = new Date(subscription.trial_start * 1000);
    }

    if (subscription.trial_end) {
      updateData.trial_end = new Date(subscription.trial_end * 1000);
    }

    await this.userPackagesRepository.update(userPackage.id, updateData);

    // Emit event for other services to react
    this.eventEmitter.emit('subscription.updated', {
      userId: userPackage.user_id,
      packageId: userPackage.package_id,
      subscriptionId: subscription.id,
      status,
      previousStatus: userPackage.status,
    });

    this.logger.log(
      `Subscription updated: ${subscription.id}, status: ${status}`,
    );
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(
    subscription: SubscriptionEventData,
  ): Promise<void> {
    const userPackage =
      await this.userPackagesRepository.findByStripeSubscriptionId(
        subscription.id,
      );

    if (!userPackage) {
      this.logger.warn(
        `UserPackage not found for subscription: ${subscription.id}`,
      );
      return;
    }

    await this.userPackagesRepository.update(userPackage.id, {
      status: SubscriptionStatus.CANCELLED,
      is_active: false,
      cancelled_at: new Date(),
    });

    // Emit event for other services to react
    this.eventEmitter.emit('subscription.cancelled', {
      userId: userPackage.user_id,
      packageId: userPackage.package_id,
      subscriptionId: subscription.id,
    });

    this.logger.log(
      `Subscription cancelled: ${subscription.id} for user: ${userPackage.user_id}`,
    );
  }

  /**
   * Handle checkout session completed event
   */
  private async handleCheckoutSessionCompleted(session: any): Promise<void> {
    if (session.mode !== 'subscription') {
      return; // Only handle subscription checkouts
    }

    const userId = session.metadata?.user_id;
    const subscriptionId = session.subscription;

    if (!userId || !subscriptionId) {
      this.logger.warn(
        `Missing data in checkout session ${session.id}: userId=${userId}, subscriptionId=${subscriptionId}`,
      );
      return;
    }

    // Emit event for other services to react
    this.eventEmitter.emit('checkout.completed', {
      userId,
      sessionId: session.id,
      subscriptionId,
      customerId: session.customer,
    });

    this.logger.log(
      `Checkout session completed: ${session.id} for user: ${userId}`,
    );
  }

  /**
   * Handle checkout session expired event
   */
  private async handleCheckoutSessionExpired(session: any): Promise<void> {
    const userId = session.metadata?.user_id;

    if (userId) {
      // Emit event for other services to react
      this.eventEmitter.emit('checkout.expired', {
        userId,
        sessionId: session.id,
      });
    }

    this.logger.log(`Checkout session expired: ${session.id}`);
  }

  /**
   * Handle invoice payment succeeded event
   */
  private async handleInvoicePaymentSucceeded(
    invoice: InvoiceEventData,
  ): Promise<void> {
    if (!invoice.subscription) {
      return; // Only handle subscription invoices
    }

    const userPackage =
      await this.userPackagesRepository.findByStripeSubscriptionId(
        invoice.subscription,
      );

    if (!userPackage) {
      this.logger.warn(
        `UserPackage not found for subscription: ${invoice.subscription}`,
      );
      return;
    }

    // Reset usage counters for new billing period
    await this.userPackagesRepository.resetUsageCounters(userPackage.id);

    // Update billing period dates
    const subscription = await this.stripeService.getSubscription(
      invoice.subscription,
    );
    await this.userPackagesRepository.update(userPackage.id, {
      current_period_start: new Date(
        (subscription as any).current_period_start * 1000,
      ),
      current_period_end: new Date(
        (subscription as any).current_period_end * 1000,
      ),
      status: this.stripeService.mapSubscriptionStatus(subscription.status),
    });

    // Emit event for other services to react
    const eventPayload = {
      userId: userPackage.user_id,
      packageId: userPackage.package_id,
      subscriptionId: invoice.subscription,
      invoiceId: invoice.id,
      amountPaid: invoice.amount_paid,
      packageName: userPackage.package.name,
      monthlyCredits: userPackage.package.monthly_credits || 0,
    };

    this.logger.log(
      `Emitting payment.succeeded event:`,
      JSON.stringify(eventPayload, null, 2),
    );
    this.eventEmitter.emit('payment.succeeded', eventPayload);

    this.logger.log(
      `Payment succeeded for subscription: ${invoice.subscription}, amount: ${invoice.amount_paid}`,
    );
  }

  /**
   * Handle invoice payment failed event
   */
  private async handleInvoicePaymentFailed(
    invoice: InvoiceEventData,
  ): Promise<void> {
    if (!invoice.subscription) {
      return; // Only handle subscription invoices
    }

    const userPackage =
      await this.userPackagesRepository.findByStripeSubscriptionId(
        invoice.subscription,
      );

    if (!userPackage) {
      this.logger.warn(
        `UserPackage not found for subscription: ${invoice.subscription}`,
      );
      return;
    }

    // Update subscription status to past_due
    await this.userPackagesRepository.update(userPackage.id, {
      status: SubscriptionStatus.PAST_DUE,
    });

    // Emit event for other services to react
    this.eventEmitter.emit('payment.failed', {
      userId: userPackage.user_id,
      packageId: userPackage.package_id,
      subscriptionId: invoice.subscription,
      invoiceId: invoice.id,
      amountDue: invoice.amount_due,
    });

    this.logger.log(
      `Payment failed for subscription: ${invoice.subscription}, amount due: ${invoice.amount_due}`,
    );
  }

  /**
   * Handle customer updated event
   */
  private async handleCustomerUpdated(
    customer: CustomerEventData,
  ): Promise<void> {
    const userId = customer.metadata?.user_id;

    if (userId) {
      // Emit event for other services to react
      this.eventEmitter.emit('customer.updated', {
        userId,
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
      });
    }

    this.logger.debug(`Customer updated: ${customer.id}`);
  }
}
