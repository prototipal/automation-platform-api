import { BillingInterval } from '@/modules/packages/enums';

export interface CreateCheckoutSessionRequest {
  packageId: number;
  billingInterval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
  customerId?: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  customerId: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export interface SubscriptionEventData {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  trial_start?: number;
  trial_end?: number;
  cancel_at_period_end: boolean;
  canceled_at?: number;
  items: {
    data: Array<{
      price: {
        id: string;
        recurring?: {
          interval: string;
        };
      };
    }>;
  };
  metadata?: Record<string, string>;
}

export interface CustomerEventData {
  id: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface InvoiceEventData {
  id: string;
  customer: string;
  subscription: string;
  status: string;
  amount_paid: number;
  amount_due: number;
  created: number;
  metadata?: Record<string, string>;
}