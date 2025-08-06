import { Test, TestingModule } from '@nestjs/testing';
import { PricingCalculationService } from '../pricing-calculation.service';
import { PricingType } from '../../interfaces';

describe('PricingCalculationService', () => {
  let service: PricingCalculationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingCalculationService],
    }).compile();

    service = module.get<PricingCalculationService>(PricingCalculationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Fixed Pricing', () => {
    it('should calculate fixed price correctly', () => {
      const rule = {
        type: PricingType.FIXED,
        price: 0.50,
      };

      const result = service.calculatePrice(rule, {});

      expect(result.totalPrice).toBe(0.50);
      expect(result.error).toBeUndefined();
      expect(result.breakdown?.basePrice).toBe(0.50);
    });

    it('should handle video-01 fixed pricing', () => {
      const rule = {
        type: PricingType.FIXED,
        price: 0.50,
      };

      const result = service.calculatePrice(rule, { prompt: 'test' });

      expect(result.totalPrice).toBe(0.50);
      expect(result.error).toBeUndefined();
    });

    it('should handle veo-3-fast fixed pricing', () => {
      const rule = {
        type: PricingType.FIXED,
        price: 3.20,
      };

      const result = service.calculatePrice(rule, { prompt: 'test' });

      expect(result.totalPrice).toBe(3.20);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Per Second Pricing', () => {
    it('should calculate per second price correctly for kling-v2.1 standard mode', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'mode',
        rates: {
          'standard': 0.05,
          'pro': 0.09,
        },
      };

      const result = service.calculatePrice(rule, {
        mode: 'standard',
        duration: 10,
      });

      expect(result.totalPrice).toBe(0.50); // 0.05 * 10
      expect(result.error).toBeUndefined();
      expect(result.breakdown?.rate).toBe(0.05);
      expect(result.breakdown?.duration).toBe(10);
    });

    it('should calculate per second price correctly for kling-v2.1 pro mode', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'mode',
        rates: {
          'standard': 0.05,
          'pro': 0.09,
        },
      };

      const result = service.calculatePrice(rule, {
        mode: 'pro',
        duration: 5,
      });

      expect(result.totalPrice).toBeCloseTo(0.45, 2); // 0.09 * 5
      expect(result.error).toBeUndefined();
      expect(result.breakdown?.rate).toBe(0.09);
      expect(result.breakdown?.duration).toBe(5);
    });

    it('should calculate per second price for seedance-1-pro with 480p resolution', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'resolution',
        rates: {
          '480p': 0.03,
          '1080p': 0.15,
        },
      };

      const result = service.calculatePrice(rule, {
        resolution: '480p',
        duration: 10,
      });

      expect(result.totalPrice).toBe(0.30); // 0.03 * 10
      expect(result.error).toBeUndefined();
    });

    it('should calculate per second price for seedance-1-pro with 1080p resolution', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'resolution',
        rates: {
          '480p': 0.03,
          '1080p': 0.15,
        },
      };

      const result = service.calculatePrice(rule, {
        resolution: '1080p',
        duration: 5,
      });

      expect(result.totalPrice).toBe(0.75); // 0.15 * 5
      expect(result.error).toBeUndefined();
    });

    it('should default to 1 second if duration is not provided', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'mode',
        rates: {
          'standard': 0.05,
        },
      };

      const result = service.calculatePrice(rule, {
        mode: 'standard',
      });

      expect(result.totalPrice).toBe(0.05); // 0.05 * 1
      expect(result.error).toBeUndefined();
      expect(result.breakdown?.duration).toBe(1);
    });

    it('should return error if required parameter is missing', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'mode',
        rates: {
          'standard': 0.05,
        },
      };

      const result = service.calculatePrice(rule, {
        duration: 10,
      });

      expect(result.totalPrice).toBe(0);
      expect(result.error).toContain('Required parameter \'mode\' is missing');
    });

    it('should return error if rate not found for parameter value', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'mode',
        rates: {
          'standard': 0.05,
        },
      };

      const result = service.calculatePrice(rule, {
        mode: 'invalid',
        duration: 10,
      });

      expect(result.totalPrice).toBe(0);
      expect(result.error).toContain('No rate found for mode=\'invalid\'');
    });
  });

  describe('Conditional Pricing', () => {
    const hailuoRule = {
      type: PricingType.CONDITIONAL,
      rules: [
        { conditions: { resolution: '512p', duration: 6 }, price: 0.10 },
        { conditions: { resolution: '512p', duration: 10 }, price: 0.15 },
        { conditions: { resolution: '768p', duration: 6 }, price: 0.27 },
        { conditions: { resolution: '768p', duration: 10 }, price: 0.45 },
        { conditions: { resolution: '1080p', duration: 6 }, price: 0.48 },
      ],
    };

    it('should calculate hailuo-02 pricing for 512p + 6s', () => {
      const result = service.calculatePrice(hailuoRule, {
        resolution: '512p',
        duration: 6,
      });

      expect(result.totalPrice).toBe(0.10);
      expect(result.error).toBeUndefined();
      expect(result.breakdown?.basePrice).toBe(0.10);
    });

    it('should calculate hailuo-02 pricing for 512p + 10s', () => {
      const result = service.calculatePrice(hailuoRule, {
        resolution: '512p',
        duration: 10,
      });

      expect(result.totalPrice).toBe(0.15);
      expect(result.error).toBeUndefined();
    });

    it('should calculate hailuo-02 pricing for 768p + 6s', () => {
      const result = service.calculatePrice(hailuoRule, {
        resolution: '768p',
        duration: 6,
      });

      expect(result.totalPrice).toBe(0.27);
      expect(result.error).toBeUndefined();
    });

    it('should calculate hailuo-02 pricing for 768p + 10s', () => {
      const result = service.calculatePrice(hailuoRule, {
        resolution: '768p',
        duration: 10,
      });

      expect(result.totalPrice).toBe(0.45);
      expect(result.error).toBeUndefined();
    });

    it('should calculate hailuo-02 pricing for 1080p + 6s', () => {
      const result = service.calculatePrice(hailuoRule, {
        resolution: '1080p',
        duration: 6,
      });

      expect(result.totalPrice).toBe(0.48);
      expect(result.error).toBeUndefined();
    });

    it('should return error for unsupported 1080p + 10s combination', () => {
      const result = service.calculatePrice(hailuoRule, {
        resolution: '1080p',
        duration: 10,
      });

      expect(result.totalPrice).toBe(0);
      expect(result.error).toContain('No matching conditional rule found');
    });

    it('should return error when no conditions match', () => {
      const result = service.calculatePrice(hailuoRule, {
        resolution: '720p',
        duration: 6,
      });

      expect(result.totalPrice).toBe(0);
      expect(result.error).toContain('No matching conditional rule found');
    });

    it('should match first applicable rule', () => {
      const multiRule = {
        type: PricingType.CONDITIONAL,
        rules: [
          { conditions: { resolution: '512p' }, price: 0.10 },
          { conditions: { resolution: '512p', duration: 6 }, price: 0.15 },
        ],
      };

      const result = service.calculatePrice(multiRule, {
        resolution: '512p',
        duration: 6,
      });

      // İlk eşleşen kuralı kullanmalı
      expect(result.totalPrice).toBe(0.10);
    });
  });

  describe('prepareCalculationParams', () => {
    it('should convert string duration to number', () => {
      const params = service.prepareCalculationParams({
        duration: '10',
        mode: 'standard',
      });

      expect(params.duration).toBe(10);
      expect(params.mode).toBe('standard');
    });

    it('should ignore undefined and null values', () => {
      const params = service.prepareCalculationParams({
        duration: '5',
        mode: 'standard',
        resolution: undefined,
        aspect_ratio: null,
      });

      expect(params.duration).toBe(5);
      expect(params.mode).toBe('standard');
      expect(params.resolution).toBeUndefined();
      expect(params.aspect_ratio).toBeUndefined();
    });

    it('should preserve non-duration string values', () => {
      const params = service.prepareCalculationParams({
        mode: 'pro',
        resolution: '1080p',
      });

      expect(params.mode).toBe('pro');
      expect(params.resolution).toBe('1080p');
    });
  });

  describe('getDefaultPrice', () => {
    it('should return fixed price for fixed pricing', () => {
      const rule = {
        type: PricingType.FIXED,
        price: 0.50,
      };

      const defaultPrice = service.getDefaultPrice(rule);
      expect(defaultPrice).toBe(0.50);
    });

    it('should return first rate for per-second pricing', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'mode',
        rates: {
          'standard': 0.05,
          'pro': 0.09,
        },
      };

      const defaultPrice = service.getDefaultPrice(rule);
      expect(defaultPrice).toBe(0.05);
    });

    it('should return first rule price for conditional pricing', () => {
      const rule = {
        type: PricingType.CONDITIONAL,
        rules: [
          { conditions: { resolution: '512p', duration: 6 }, price: 0.10 },
          { conditions: { resolution: '768p', duration: 6 }, price: 0.27 },
        ],
      };

      const defaultPrice = service.getDefaultPrice(rule);
      expect(defaultPrice).toBe(0.10);
    });

    it('should return 0 for unknown pricing type', () => {
      const rule = { type: 'unknown' } as any;
      const defaultPrice = service.getDefaultPrice(rule);
      expect(defaultPrice).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown pricing rule type', () => {
      const rule = { type: 'unknown' } as any;

      const result = service.calculatePrice(rule, {});

      expect(result.totalPrice).toBe(0);
      expect(result.error).toBe('Unknown pricing rule type');
    });

    it('should handle exceptions in calculation', () => {
      const rule = {
        type: PricingType.PER_SECOND,
        parameter: 'mode',
        rates: null, // Bu hata yaratacak
      };

      const result = service.calculatePrice(rule as any, { mode: 'standard' });

      expect(result.totalPrice).toBe(0);
      expect(result.error).toContain('Pricing calculation error:');
    });
  });
});