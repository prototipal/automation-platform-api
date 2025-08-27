import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PricingRule,
  PricingType,
  PricingCalculationParams,
  PricingCalculationResult,
  FixedPricing,
  PerSecondPricing,
  ConditionalPricing,
  CreditCalculationResult,
  PriceEstimationBreakdown,
} from '../interfaces';

@Injectable()
export class PricingCalculationService {
  private readonly logger = new Logger(PricingCalculationService.name);
  private readonly profitMargin: number;
  private readonly creditValueUsd: number;

  constructor(private readonly configService: ConfigService) {
    this.profitMargin = this.configService.get<number>('PROFIT_MARGIN', 1.5);
    this.creditValueUsd = this.configService.get<number>(
      'CREDIT_VALUE_USD',
      0.05,
    );

    this.logger.log(
      `Pricing configuration - Profit Margin: ${this.profitMargin}, Credit Value: $${this.creditValueUsd}`,
    );
  }
  /**
   * Verilen pricing rule'ına ve parametrelere göre toplam fiyatı hesaplar
   */
  calculatePrice(
    rule: PricingRule,
    params: PricingCalculationParams,
  ): PricingCalculationResult {
    try {
      switch (rule.type) {
        case PricingType.FIXED:
          return this.calculateFixedPrice(rule, params);

        case PricingType.PER_SECOND:
          return this.calculatePerSecondPrice(rule, params);

        case PricingType.CONDITIONAL:
          return this.calculateConditionalPrice(rule, params);

        default:
          return {
            totalPrice: 0,
            error: 'Unknown pricing rule type',
          };
      }
    } catch (error) {
      return {
        totalPrice: 0,
        error: `Pricing calculation error: ${error.message}`,
      };
    }
  }

  private calculateFixedPrice(
    rule: FixedPricing,
    params: PricingCalculationParams,
  ): PricingCalculationResult {
    return {
      totalPrice: rule.price,
      breakdown: {
        basePrice: rule.price,
        rule: 'Fixed pricing',
      },
    };
  }

  private calculatePerSecondPrice(
    rule: PerSecondPricing,
    params: PricingCalculationParams,
  ): PricingCalculationResult {
    const { parameter, rates } = rule;
    const paramValue = params[parameter];
    const durationParam = params.duration || 1;

    // Duration'ı number'a dönüştür
    const duration =
      typeof durationParam === 'string'
        ? parseFloat(durationParam)
        : durationParam;

    if (!paramValue) {
      return {
        totalPrice: 0,
        error: `Required parameter '${parameter}' is missing`,
      };
    }

    const rate = rates[paramValue as string];
    if (rate === undefined) {
      return {
        totalPrice: 0,
        error: `No rate found for ${parameter}='${paramValue}'`,
      };
    }

    if (isNaN(duration)) {
      return {
        totalPrice: 0,
        error: `Invalid duration value: ${durationParam}`,
      };
    }

    const totalPrice = rate * duration;

    return {
      totalPrice,
      breakdown: {
        rate,
        duration,
        rule: `Per second pricing (${parameter}=${paramValue})`,
      },
    };
  }

  private calculateConditionalPrice(
    rule: ConditionalPricing,
    params: PricingCalculationParams,
  ): PricingCalculationResult {
    // Koşulları kontrol et ve eşleşen kuralı bul
    for (const conditionalRule of rule.rules) {
      let matches = true;

      for (const [param, expectedValue] of Object.entries(
        conditionalRule.conditions,
      )) {
        if (params[param] !== expectedValue) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return {
          totalPrice: conditionalRule.price,
          breakdown: {
            basePrice: conditionalRule.price,
            rule: `Conditional pricing: ${JSON.stringify(
              conditionalRule.conditions,
            )}`,
          },
        };
      }
    }

    return {
      totalPrice: 0,
      error: 'No matching conditional rule found for given parameters',
    };
  }

  /**
   * Servis parametrelerine göre fiyat hesaplaması için yardımcı method
   * Kullanıcı input'larını PricingCalculationParams formatına dönüştürür
   */
  prepareCalculationParams(
    serviceParams: Record<string, any>,
  ): PricingCalculationParams {
    const params: PricingCalculationParams = {};

    Object.entries(serviceParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Duration'ı number'a dönüştür
        if (key === 'duration' && typeof value === 'string') {
          params[key] = parseInt(value, 10);
        } else {
          params[key] = value;
        }
      }
    });

    return params;
  }

  /**
   * Hata durumlarında default fiyat döndürmek için
   */
  getDefaultPrice(rule: PricingRule): number {
    switch (rule.type) {
      case PricingType.FIXED:
        return rule.price;

      case PricingType.PER_SECOND:
        // İlk rate'i default olarak al
        const firstRate = Object.values(rule.rates)[0];
        return firstRate || 0;

      case PricingType.CONDITIONAL:
        // İlk rule'ın fiyatını default olarak al
        return rule.rules[0]?.price || 0;

      default:
        return 0;
    }
  }

  /**
   * Calculates required credits using the new pricing formula:
   * user_credits_required = (replicate_usd_cost * profit_margin) / credit_value
   */
  calculateRequiredCredits(
    rule: PricingRule,
    params: PricingCalculationParams,
  ): CreditCalculationResult {
    try {
      // First calculate the base USD cost using existing pricing logic
      const pricingResult = this.calculatePrice(rule, params);

      if (pricingResult.error) {
        return {
          estimated_credits: 0,
          breakdown: {
            replicate_cost_usd: 0,
            profit_margin: this.profitMargin,
            total_cost_usd: 0,
            credit_value_usd: this.creditValueUsd,
            estimated_credits_raw: 0,
            estimated_credits_rounded: 0,
          },
          error: pricingResult.error,
        };
      }

      const replicateCostUsd = pricingResult.totalPrice;
      const totalCostUsd = replicateCostUsd * this.profitMargin;
      const estimatedCreditsRaw = totalCostUsd / this.creditValueUsd;
      const estimatedCreditsRounded = this.roundToHalf(estimatedCreditsRaw);

      this.logger.log(
        `Credit calculation - Replicate: $${replicateCostUsd}, ` +
          `Total (${this.profitMargin}x): $${totalCostUsd}, ` +
          `Credits: ${estimatedCreditsRaw} -> ${estimatedCreditsRounded}`,
      );

      return {
        estimated_credits: estimatedCreditsRounded,
        breakdown: {
          replicate_cost_usd: replicateCostUsd,
          profit_margin: this.profitMargin,
          total_cost_usd: totalCostUsd,
          credit_value_usd: this.creditValueUsd,
          estimated_credits_raw: estimatedCreditsRaw,
          estimated_credits_rounded: estimatedCreditsRounded,
        },
      };
    } catch (error) {
      this.logger.error('Error calculating required credits:', error);
      return {
        estimated_credits: 0,
        breakdown: {
          replicate_cost_usd: 0,
          profit_margin: this.profitMargin,
          total_cost_usd: 0,
          credit_value_usd: this.creditValueUsd,
          estimated_credits_raw: 0,
          estimated_credits_rounded: 0,
        },
        error: `Credit calculation error: ${error.message}`,
      };
    }
  }

  /**
   * Creates a complete price estimation breakdown for API responses
   */
  createPriceEstimation(
    rule: PricingRule,
    params: PricingCalculationParams,
    model: string,
    modelVersion: string,
  ): PriceEstimationBreakdown {
    const creditResult = this.calculateRequiredCredits(rule, params);

    return {
      estimated_credits: creditResult.estimated_credits,
      breakdown: creditResult.breakdown,
      service_details: {
        model,
        model_version: modelVersion,
        pricing_type: rule.type,
      },
    };
  }

  /**
   * Gets default credits using new formula for error scenarios
   */
  getDefaultCredits(rule: PricingRule): number {
    const defaultPriceUsd = this.getDefaultPrice(rule);
    const totalCostUsd = defaultPriceUsd * this.profitMargin;
    const creditsRaw = totalCostUsd / this.creditValueUsd;
    return this.roundToHalf(creditsRaw);
  }

  /**
   * Round to nearest 0.5 (half) value
   * Examples: 2.14 -> 2.5, 2.34 -> 2.5, 2.60 -> 3.0, 2.75 -> 3.0
   */
  private roundToHalf(value: number): number {
    return Math.ceil(value * 2) / 2;
  }
}
