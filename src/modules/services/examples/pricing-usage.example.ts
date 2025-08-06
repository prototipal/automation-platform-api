/**
 * PricingCalculationService Kullanım Örnekleri
 * 
 * Bu dosya dinamik pricing sisteminin nasıl kullanılacağına dair örnekler içerir.
 * Gerçek kodda bu dosya silinebilir, sadece referans amaçlıdır.
 */

import { PricingCalculationService } from '../services';
import {
  PricingType,
  PricingRule,
  FixedPricing,
  PerSecondPricing,
  ConditionalPricing,
  PricingCalculationParams,
  PricingCalculationResult,
} from '../interfaces';

// Service instance'ı (normalde dependency injection ile gelir)
// const pricingService = new PricingCalculationService(); // Example only - would need ConfigService in real usage
const pricingService = null as any; // Placeholder for examples

/**
 * Örnek 1: KLING-V2.1 - Mode'a göre per-second pricing
 */
function calculateKlingPrice(): void {
  const klingRule: PerSecondPricing = {
    type: PricingType.PER_SECOND,
    parameter: 'mode',
    rates: {
      'standard': 0.05,
      'pro': 0.09,
    },
  };

  // Standard mode, 10 saniye
  const standardParams: PricingCalculationParams = {
    mode: 'standard',
    duration: 10,
  };
  const standardResult: PricingCalculationResult = pricingService.calculatePrice(klingRule, standardParams);
  console.log('Kling Standard 10s:', standardResult.totalPrice); // 0.50

  // Pro mode, 5 saniye  
  const proParams: PricingCalculationParams = {
    mode: 'pro',
    duration: 5,
  };
  const proResult: PricingCalculationResult = pricingService.calculatePrice(klingRule, proParams);
  console.log('Kling Pro 5s:', proResult.totalPrice); // 0.45
}

/**
 * Örnek 2: HAILUO-02 - Resolution + Duration kombinasyonu
 */
function calculateHailuoPrice(): void {
  const hailuoRule: ConditionalPricing = {
    type: PricingType.CONDITIONAL,
    rules: [
      { conditions: { resolution: '512p', duration: 6 }, price: 0.10 },
      { conditions: { resolution: '512p', duration: 10 }, price: 0.15 },
      { conditions: { resolution: '768p', duration: 6 }, price: 0.27 },
      { conditions: { resolution: '768p', duration: 10 }, price: 0.45 },
      { conditions: { resolution: '1080p', duration: 6 }, price: 0.48 },
    ],
  };

  // 768p + 10 saniye
  const params1: PricingCalculationParams = {
    resolution: '768p',
    duration: 10,
  };
  const result: PricingCalculationResult = pricingService.calculatePrice(hailuoRule, params1);
  console.log('Hailuo 768p 10s:', result.totalPrice); // 0.45

  // 1080p + 10 saniye (desteklenmiyor)
  const params2: PricingCalculationParams = {
    resolution: '1080p',
    duration: 10,
  };
  const unsupportedResult: PricingCalculationResult = pricingService.calculatePrice(hailuoRule, params2);
  console.log('Hailuo 1080p 10s Error:', unsupportedResult.error);
}

/**
 * Örnek 3: SEEDANCE-1-PRO - Resolution'a göre per-second
 */
function calculateSeedancePrice(): void {
  const seedanceRule: PerSecondPricing = {
    type: PricingType.PER_SECOND,
    parameter: 'resolution',
    rates: {
      '480p': 0.03,
      '1080p': 0.15,
    },
  };

  // 1080p, 10 saniye
  const params: PricingCalculationParams = {
    resolution: '1080p',
    duration: 10,
  };
  const result: PricingCalculationResult = pricingService.calculatePrice(seedanceRule, params);
  console.log('Seedance 1080p 10s:', result.totalPrice); // 1.50
}

/**
 * Örnek 4: Sabit Fiyatlı Servisler
 */
function calculateFixedPrices(): void {
  // VIDEO-01
  const video01Rule: FixedPricing = {
    type: PricingType.FIXED,
    price: 0.50,
  };
  
  const emptyParams: PricingCalculationParams = {};
  const video01Result: PricingCalculationResult = pricingService.calculatePrice(video01Rule, emptyParams);
  console.log('Video-01:', video01Result.totalPrice); // 0.50

  // VEO-3-FAST
  const veo3Rule: FixedPricing = {
    type: PricingType.FIXED,
    price: 3.20,
  };
  
  const veo3Result: PricingCalculationResult = pricingService.calculatePrice(veo3Rule, emptyParams);
  console.log('VEO-3-FAST:', veo3Result.totalPrice); // 3.20

  // IDEOGRAM-V3-TURBO
  const ideogramRule: FixedPricing = {
    type: PricingType.FIXED,
    price: 0.03,
  };
  
  const ideogramResult: PricingCalculationResult = pricingService.calculatePrice(ideogramRule, emptyParams);
  console.log('Ideogram V3 Turbo:', ideogramResult.totalPrice); // 0.03
}

/**
 * Örnek 5: Service'ten alınan parametrelerle kullanım
 */
async function calculatePriceFromService(
  serviceEntity: { pricing: { rule: PricingRule } }, 
  userParams: Record<string, any>
): Promise<number> {
  // Service entity'den pricing rule'ını al
  const pricingRule: PricingRule = serviceEntity.pricing.rule;
  
  // User parametrelerini hazırla
  const calculationParams: PricingCalculationParams = pricingService.prepareCalculationParams(userParams);
  
  // Fiyatı hesapla
  const result: PricingCalculationResult = pricingService.calculatePrice(pricingRule, calculationParams);
  
  if (result.error) {
    console.error('Pricing calculation failed:', result.error);
    // Fallback: default fiyat kullan
    const defaultPrice: number = pricingService.getDefaultPrice(pricingRule);
    return defaultPrice;
  }
  
  console.log('Calculation breakdown:', result.breakdown);
  return result.totalPrice;
}

/**
 * Örnek 6: Token düşürme işlemi
 */
async function deductTokensForGeneration(
  userId: string,
  serviceEntity: { pricing: { rule: PricingRule } },
  generationParams: Record<string, any>,
  userTokenBalance: number
): Promise<{
  deductedAmount: number;
  newBalance: number;
  breakdown: PricingCalculationResult['breakdown'];
}> {
  // Fiyatı hesapla
  const calculationParams: PricingCalculationParams = pricingService.prepareCalculationParams(generationParams);
  const pricingResult: PricingCalculationResult = pricingService.calculatePrice(
    serviceEntity.pricing.rule,
    calculationParams
  );
  
  if (pricingResult.error) {
    throw new Error(`Cannot calculate price: ${pricingResult.error}`);
  }
  
  const requiredTokens: number = pricingResult.totalPrice;
  
  // Token kontrolü
  if (userTokenBalance < requiredTokens) {
    throw new Error(`Insufficient tokens. Required: ${requiredTokens}, Available: ${userTokenBalance}`);
  }
  
  // Token düş
  const newBalance: number = userTokenBalance - requiredTokens;
  
  console.log(`Deducted ${requiredTokens} tokens. New balance: ${newBalance}`);
  
  return {
    deductedAmount: requiredTokens,
    newBalance,
    breakdown: pricingResult.breakdown,
  };
}

// Test çalıştırma
if (require.main === module) {
  console.log('=== Pricing Usage Examples ===');
  calculateKlingPrice();
  calculateHailuoPrice();
  calculateSeedancePrice();
  calculateFixedPrices();
}