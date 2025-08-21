import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CreditManagementService } from '@/modules/credits/services';

@Injectable()
export class SubscriptionEventsListener {
  private readonly logger = new Logger(SubscriptionEventsListener.name);

  constructor(
    private readonly creditManagementService: CreditManagementService,
  ) {}

  /**
   * Handle subscription creation - set up initial playground credits
   */
  @OnEvent('subscription.created')
  async handleSubscriptionCreated(payload: {
    userId: string;
    packageId: number;
    subscriptionId: string;
    status: string;
    packageName: string;
    monthlyCredits: number;
    hasTrialPeriod: boolean;
  }): Promise<void> {
    try {
      this.logger.log(`Handling subscription created event for user ${payload.userId}, package ${payload.packageId}`);

      // If there's no trial period, set up credits immediately
      // If there's a trial period, credits will be set up when the first payment succeeds
      if (!payload.hasTrialPeriod && payload.status === 'active') {
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await this.creditManagementService.handleSubscriptionPeriodStart(
          payload.userId,
          payload.packageId,
          payload.packageName,
          payload.monthlyCredits,
          now,
          nextMonth
        );

        this.logger.log(`Initial credits set up for user ${payload.userId}: ${payload.monthlyCredits} playground credits`);
      } else {
        this.logger.log(`Credits will be set up later for user ${payload.userId} (trial period: ${payload.hasTrialPeriod}, status: ${payload.status})`);
      }
      
      this.logger.log(`Subscription created event processed for user ${payload.userId}`);

    } catch (error) {
      this.logger.error(`Error handling subscription created event for user ${payload.userId}:`, error);
    }
  }

  /**
   * Handle subscription update - may affect credit allocations
   */
  @OnEvent('subscription.updated')
  async handleSubscriptionUpdated(payload: {
    userId: string;
    packageId: number;
    subscriptionId: string;
    status: string;
    previousStatus: string;
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling subscription updated event for user ${payload.userId}: ` +
        `${payload.previousStatus} -> ${payload.status}`
      );

      // If subscription was reactivated from a cancelled/past_due state
      if (
        (payload.previousStatus === 'cancelled' || payload.previousStatus === 'past_due') &&
        payload.status === 'active'
      ) {
        // This will be handled by the payment.succeeded event when payment resumes
        this.logger.log(`Subscription reactivated for user ${payload.userId}, credits will be restored on next payment`);
      }

      this.logger.log(`Subscription updated event processed for user ${payload.userId}`);

    } catch (error) {
      this.logger.error(`Error handling subscription updated event for user ${payload.userId}:`, error);
    }
  }

  /**
   * Handle subscription cancellation - reset playground credits to 0
   */
  @OnEvent('subscription.cancelled')
  async handleSubscriptionCancelled(payload: {
    userId: string;
    packageId: number;
    subscriptionId: string;
  }): Promise<void> {
    try {
      this.logger.log(`Handling subscription cancelled event for user ${payload.userId}`);

      await this.creditManagementService.handleSubscriptionCancellation(
        payload.userId,
        payload.packageId
      );

      this.logger.log(`Subscription cancelled event processed for user ${payload.userId}`);

    } catch (error) {
      this.logger.error(`Error handling subscription cancelled event for user ${payload.userId}:`, error);
    }
  }

  /**
   * Handle successful payment - reset/refill playground credits for new billing period
   */
  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(payload: {
    userId: string;
    packageId: number;
    subscriptionId: string;
    invoiceId: string;
    amountPaid: number;
    packageName: string;
    monthlyCredits: number;
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling payment succeeded event for user ${payload.userId}, ` +
        `package ${payload.packageId}, amount $${payload.amountPaid / 100}`
      );

      // Get current date for period calculation
      const now = new Date();
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      await this.creditManagementService.handleSubscriptionPeriodStart(
        payload.userId,
        payload.packageId,
        payload.packageName,
        payload.monthlyCredits,
        now,
        nextMonth
      );

      this.logger.log(`Payment succeeded event processed for user ${payload.userId}`);

    } catch (error) {
      this.logger.error(`Error handling payment succeeded event for user ${payload.userId}:`, error);
    }
  }

  /**
   * Handle failed payment - may affect credit availability
   */
  @OnEvent('payment.failed')
  async handlePaymentFailed(payload: {
    userId: string;
    packageId: number;
    subscriptionId: string;
    invoiceId: string;
    amountDue: number;
  }): Promise<void> {
    try {
      this.logger.log(
        `Handling payment failed event for user ${payload.userId}, ` +
        `amount due $${payload.amountDue / 100}`
      );

      // For now, we don't immediately reset credits on payment failure
      // The subscription status will change to 'past_due' and credits will be affected
      // only if the subscription is eventually cancelled
      
      this.logger.log(`Payment failed event processed for user ${payload.userId}`);

    } catch (error) {
      this.logger.error(`Error handling payment failed event for user ${payload.userId}:`, error);
    }
  }

  /**
   * Handle checkout completion - may set up initial credits for new subscriptions
   */
  @OnEvent('checkout.completed')
  async handleCheckoutCompleted(payload: {
    userId: string;
    sessionId: string;
    subscriptionId: string;
    customerId: string;
  }): Promise<void> {
    try {
      this.logger.log(`Handling checkout completed event for user ${payload.userId}`);

      // The actual credit setup will be handled by the payment.succeeded event
      // that follows the checkout completion
      
      this.logger.log(`Checkout completed event processed for user ${payload.userId}`);

    } catch (error) {
      this.logger.error(`Error handling checkout completed event for user ${payload.userId}:`, error);
    }
  }

  /**
   * Handle checkout expiration
   */
  @OnEvent('checkout.expired')
  async handleCheckoutExpired(payload: {
    userId: string;
    sessionId: string;
  }): Promise<void> {
    try {
      this.logger.log(`Handling checkout expired event for user ${payload.userId}`);

      // No credit actions needed for expired checkout
      
      this.logger.log(`Checkout expired event processed for user ${payload.userId}`);

    } catch (error) {
      this.logger.error(`Error handling checkout expired event for user ${payload.userId}:`, error);
    }
  }
}