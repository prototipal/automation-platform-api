import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PackagesService } from '@/modules/packages/packages.service';

export interface UserCreatedEvent {
  userId: string;
  email?: string;
  name?: string;
}

export interface SubscriptionCreatedEvent {
  userId: string;
  packageId: number;
  subscriptionId: string;
  status: string;
}

export interface SubscriptionUpdatedEvent {
  userId: string;
  packageId: number;
  subscriptionId: string;
  status: string;
  previousStatus: string;
}

export interface SubscriptionCancelledEvent {
  userId: string;
  packageId: number;
  subscriptionId: string;
}

export interface PaymentSucceededEvent {
  userId: string;
  packageId: number;
  subscriptionId: string;
  invoiceId: string;
  amountPaid: number;
}

export interface PaymentFailedEvent {
  userId: string;
  packageId: number;
  subscriptionId: string;
  invoiceId: string;
  amountDue: number;
}

@Injectable()
export class UserEventsListener {
  private readonly logger = new Logger(UserEventsListener.name);

  constructor(private readonly packagesService: PackagesService) {}

  /**
   * Handle user creation event - assign default/free package
   */
  @OnEvent('user.created')
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      this.logger.log(`Handling user created event for user: ${event.userId}`);

      // Check if user already has a package (in case of duplicate events)
      const existingPackage = await this.packagesService.getUserCurrentPackage(event.userId);
      
      if (existingPackage) {
        this.logger.log(`User ${event.userId} already has a package: ${existingPackage.package.type}`);
        return;
      }

      // Assign default/free package to new user
      const userPackage = await this.packagesService.assignDefaultPackageToNewUser(event.userId);

      this.logger.log(
        `Default package assigned to new user ${event.userId}: ${userPackage.package.type}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to assign default package to user ${event.userId}:`,
        error
      );
      // Don't throw error to prevent blocking other user creation processes
    }
  }

  /**
   * Handle subscription created event
   */
  @OnEvent('subscription.created')
  async handleSubscriptionCreated(event: SubscriptionCreatedEvent): Promise<void> {
    this.logger.log(
      `Subscription created for user ${event.userId}: ${event.subscriptionId} (status: ${event.status})`
    );
    
    // Emit notification event for other services (email, analytics, etc.)
    // You can add additional logic here like sending welcome emails, updating analytics, etc.
  }

  /**
   * Handle subscription updated event
   */
  @OnEvent('subscription.updated')
  async handleSubscriptionUpdated(event: SubscriptionUpdatedEvent): Promise<void> {
    this.logger.log(
      `Subscription updated for user ${event.userId}: ${event.subscriptionId} (${event.previousStatus} -> ${event.status})`
    );

    // Handle specific status changes
    if (event.previousStatus === 'trialing' && event.status === 'active') {
      this.logger.log(`Trial ended for user ${event.userId}, subscription now active`);
      // You could send a "trial ended" notification here
    }

    if (event.status === 'past_due') {
      this.logger.log(`Payment failed for user ${event.userId}, subscription past due`);
      // You could send a "payment failed" notification here
    }
  }

  /**
   * Handle subscription cancelled event
   */
  @OnEvent('subscription.cancelled')
  async handleSubscriptionCancelled(event: SubscriptionCancelledEvent): Promise<void> {
    try {
      this.logger.log(
        `Subscription cancelled for user ${event.userId}: ${event.subscriptionId}`
      );

      // Optionally, assign free package if user has no other active subscriptions
      const currentPackage = await this.packagesService.getUserCurrentPackage(event.userId);
      
      if (!currentPackage || currentPackage.status === 'cancelled') {
        this.logger.log(`Assigning free package to user ${event.userId} after cancellation`);
        await this.packagesService.assignDefaultPackageToNewUser(event.userId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle subscription cancellation for user ${event.userId}:`,
        error
      );
    }
  }

  /**
   * Handle payment succeeded event
   */
  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(event: PaymentSucceededEvent): Promise<void> {
    this.logger.log(
      `Payment succeeded for user ${event.userId}: $${event.amountPaid / 100} (invoice: ${event.invoiceId})`
    );
    
    // You could send a "payment confirmation" email here
    // You could update analytics/metrics here
  }

  /**
   * Handle payment failed event
   */
  @OnEvent('payment.failed')
  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    this.logger.log(
      `Payment failed for user ${event.userId}: $${event.amountDue / 100} due (invoice: ${event.invoiceId})`
    );
    
    // You could send a "payment failed" notification here
    // You could initiate dunning management here
  }

  /**
   * Handle checkout completed event
   */
  @OnEvent('checkout.completed')
  async handleCheckoutCompleted(event: { userId: string; sessionId: string; subscriptionId: string }): Promise<void> {
    this.logger.log(
      `Checkout completed for user ${event.userId}: session ${event.sessionId}, subscription ${event.subscriptionId}`
    );
    
    // You could send a "welcome to paid plan" email here
    // You could update analytics/conversion tracking here
  }

  /**
   * Handle checkout expired event
   */
  @OnEvent('checkout.expired')
  async handleCheckoutExpired(event: { userId: string; sessionId: string }): Promise<void> {
    this.logger.log(
      `Checkout session expired for user ${event.userId}: ${event.sessionId}`
    );
    
    // You could send a "complete your subscription" reminder email here
  }
}