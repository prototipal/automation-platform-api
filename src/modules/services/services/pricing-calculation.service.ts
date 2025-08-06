import { Injectable } from '@nestjs/common';
import {
  PricingRule,
  PricingType,
  PricingCalculationParams,
  PricingCalculationResult,
  FixedPricing,
  PerSecondPricing,
  ConditionalPricing,
} from '../interfaces';

@Injectable()
export class PricingCalculationService {
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
    const duration = typeof durationParam === 'string' ? parseFloat(durationParam) : durationParam;

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
}