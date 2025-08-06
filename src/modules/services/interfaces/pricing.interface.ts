export enum PricingType {
  FIXED = 'fixed',
  PER_SECOND = 'per_second',
  CONDITIONAL = 'conditional',
}

export interface FixedPricing {
  type: PricingType.FIXED;
  price: number;
}

export interface PerSecondPricing {
  type: PricingType.PER_SECOND;
  rates: {
    [key: string]: number; // parameter değerine göre per-second fiyat
  };
  parameter: string; // hangi parametre kullanılacak (örn: "mode", "resolution")
}

export interface ConditionalPricing {
  type: PricingType.CONDITIONAL;
  rules: ConditionalRule[];
}

export interface ConditionalRule {
  conditions: {
    [parameter: string]: string | number; // koşullar
  };
  price: number;
}

export type PricingRule = FixedPricing | PerSecondPricing | ConditionalPricing;

export interface PricingCalculationParams {
  [key: string]: string | number;
}

export interface PricingCalculationResult {
  totalPrice: number;
  breakdown?: {
    basePrice?: number;
    duration?: number;
    rate?: number;
    rule?: string;
  };
  error?: string;
}