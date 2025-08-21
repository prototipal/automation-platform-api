export enum CreditType {
  PLAYGROUND = 'playground',
  API = 'api',
}

export enum CreditOperation {
  DEDUCT = 'deduct',
  REFILL = 'refill',
  RESET = 'reset',
  TRANSFER = 'transfer',
}

export enum CreditSource {
  SUBSCRIPTION_REFILL = 'subscription_refill',
  SUBSCRIPTION_RESET = 'subscription_reset',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  API_PURCHASE = 'api_purchase',
  PROMOTION = 'promotion',
  MIGRATION = 'migration',
}