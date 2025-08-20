export enum PackageType {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ULTIMATE = 'ultimate',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  TRIALING = 'trialing',
}

export enum BillingInterval {
  MONTH = 'month',
  YEAR = 'year',
}