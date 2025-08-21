import { CreditType, CreditOperation, CreditSource } from '@/modules/credits/enums';

export interface CreditBalance {
  playground_credits: number;
  api_credits: number;
  available_playground_credits: number;
  available_api_credits: number;
  total_available_credits: number;
  playground_credits_used_current_period: number;
  api_credits_used_total: number;
}

export interface CreditTransaction {
  user_id: string;
  credit_type: CreditType;
  operation: CreditOperation;
  amount: number;
  source: CreditSource;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreditDeductionRequest {
  user_id: string;
  amount: number;
  credit_type?: CreditType; // If not specified, will try playground first, then API
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreditDeductionResult {
  success: boolean;
  deducted_amount: number;
  remaining_playground_credits: number;
  remaining_api_credits: number;
  credit_type_used: CreditType;
  error?: string;
}

export interface CreditRefillRequest {
  user_id: string;
  playground_credits?: number;
  api_credits?: number;
  source: CreditSource;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreditResetRequest {
  user_id: string;
  playground_credits: number;
  reset_usage_counters?: boolean;
  source: CreditSource;
  description?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionCreditSettings {
  package_id: number;
  monthly_playground_credits: number;
  reset_on_period_start: boolean;
  billing_interval: 'month' | 'year';
}

export interface CreditUsageReport {
  user_id: string;
  current_period_start?: Date;
  current_period_end?: Date;
  playground_credits_allocated: number;
  playground_credits_used: number;
  playground_credits_remaining: number;
  api_credits_total: number;
  api_credits_used_lifetime: number;
  api_credits_remaining: number;
}