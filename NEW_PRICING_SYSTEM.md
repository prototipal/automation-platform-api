# New Credit/Token Pricing System Implementation

## Overview

The pricing system has been updated to implement a comprehensive credit-based system with profit margin calculation, replacing the direct USD pricing approach.

## Key Changes

### 1. **Credit System**
- **$5 = 100 credits** (1 credit = $0.05)
- All pricing is now calculated in credits instead of direct USD
- Credits are always rounded up to avoid fractional amounts

### 2. **Profit Margin System**
- Configurable `PROFIT_MARGIN` environment variable (default: 1.5 for 50% profit)
- Formula: `user_credits_required = (replicate_usd_cost * profit_margin) / credit_value`

### 3. **New Pricing Formula Example**
```
Replicate service costs: $0.08
Profit margin: 1.5 (50% profit)
Total cost to user: $0.08 × 1.5 = $0.12
Credit value: $0.05 (since $5 = 100 credits)
Required credits: $0.12 ÷ $0.05 = 2.4 → **3 credits** (rounded up)
```

## Implementation Details

### Environment Variables
Add to your `.env` file:
```env
PROFIT_MARGIN=1.5
CREDIT_VALUE_USD=0.05
```

### New API Endpoint: Price Estimation
**POST** `/api/generations/estimate-price`

**Request Body:**
```json
{
  "model": "BLACK_FOREST_LABS",
  "model_version": "flux-kontext-max",
  "input": {
    "prompt": "A beautiful sunset over mountains",
    "width": 1024,
    "height": 1024,
    "num_inference_steps": 50
  }
}
```

**Response:**
```json
{
  "estimated_credits": 3,
  "breakdown": {
    "replicate_cost_usd": 0.08,
    "profit_margin": 1.5,
    "total_cost_usd": 0.12,
    "credit_value_usd": 0.05,
    "estimated_credits_raw": 2.4,
    "estimated_credits_rounded": 3
  },
  "service_details": {
    "model": "BLACK_FOREST_LABS",
    "model_version": "flux-kontext-max",
    "pricing_type": "fixed"
  }
}
```

### Features

1. **Public Price Estimation Endpoint**
   - No authentication required
   - Returns detailed cost breakdown
   - Same validation as generation endpoint
   - Works for all service types (fixed, per-second, conditional)

2. **Comprehensive Logging**
   - Detailed pricing calculation logs
   - Credit deduction tracking
   - Error handling with fallbacks

3. **Backward Compatibility**
   - All existing endpoints continue to work
   - Automatic migration to new credit calculation
   - Maintains existing validation and error handling

4. **Enhanced Security**
   - Validates all inputs before calculation
   - Proper error handling for edge cases
   - Comprehensive unit testing

## Service Types Supported

### Fixed Pricing
```typescript
// Example: FLUX_KONTEXT_MAX at $0.08
const rule = {
  type: "fixed",
  price: 0.08
};
// Result: 3 credits (0.08 × 1.5 ÷ 0.05 = 2.4 → 3)
```

### Per-Second Pricing
```typescript
// Example: KLING_V2_1 with mode-based rates
const rule = {
  type: "per_second",
  parameter: "mode",
  rates: {
    "standard": 0.05,
    "pro": 0.09
  }
};
// For pro mode, 10 seconds: (0.09 × 10 × 1.5) ÷ 0.05 = 27 credits
```

### Conditional Pricing
```typescript
// Example: HAILUO_02 with resolution + duration conditions
const rule = {
  type: "conditional",
  rules: [
    { conditions: { resolution: "768p", duration: 10 }, price: 0.45 }
  ]
};
// Result: (0.45 × 1.5) ÷ 0.05 = 13.5 → 14 credits
```

## Testing

Comprehensive unit tests included covering:
- Fixed, per-second, and conditional pricing calculations
- Credit calculation with profit margins
- Price estimation API responses
- Error handling and edge cases
- Floating point precision handling
- Integration workflows

Run tests:
```bash
npm test -- src/modules/services/services/__tests__/pricing-calculation.service.spec.ts
```

## Migration Notes

### For Users
- No action required - existing API calls continue to work
- New `/estimate-price` endpoint available for cost estimation
- Credit calculations now include profit margin

### For Developers
- Import new interfaces from `@/modules/services/interfaces`
- Use `calculateRequiredCredits()` instead of `calculatePrice()` for credit calculations
- New DTOs available: `EstimateGenerationPriceDto`, `PriceEstimationResponseDto`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PROFIT_MARGIN` | 1.5 | Multiplier for profit (1.5 = 50% profit) |
| `CREDIT_VALUE_USD` | 0.05 | USD value per credit ($5 = 100 credits) |

## API Documentation

The new endpoint is fully documented with Swagger/OpenAPI, including:
- Request/response schemas
- Example payloads
- Error responses
- Detailed calculation explanations

Visit `/api` (Swagger UI) to explore the new endpoint interactively.