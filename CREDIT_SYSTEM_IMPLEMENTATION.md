# Credit System Implementation Guide

## Overview

This document outlines the comprehensive credit system implementation for the subscription-based platform. The system supports two distinct types of credits with different lifecycle management rules.

## Architecture Decision

We chose to **extend the existing `user_credits` table** rather than create separate tables for the following reasons:

1. **Simplicity**: Single table is easier to maintain and query
2. **Atomic Operations**: Better transaction management with single table
3. **Backward Compatibility**: Maintains existing integrations with minimal changes
4. **Scalability**: Can accommodate future credit types easily

## Credit Types

### 1. Playground Credits
- **Purpose**: Frontend playground usage
- **Behavior**: Reset monthly when subscription renews
- **Lifecycle**: Tied to subscription cycles
- **Reset Trigger**: Subscription period start or payment success
- **Cancellation**: Reset to 0 when subscription is cancelled

### 2. API Credits
- **Purpose**: API usage
- **Behavior**: Persistent across subscription cycles
- **Lifecycle**: Independent of subscription changes
- **Accumulation**: Can be purchased separately or added as bonuses
- **Cancellation**: Remain untouched when subscription is cancelled

## Database Schema

### Enhanced `user_credits` Table

```sql
-- New columns added to existing table
ALTER TABLE user_credits ADD COLUMN playground_credits integer NOT NULL DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN api_credits integer NOT NULL DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN playground_credits_used_current_period integer NOT NULL DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN api_credits_used_total integer NOT NULL DEFAULT 0;
ALTER TABLE user_credits ADD COLUMN playground_credits_last_reset timestamp with time zone;
ALTER TABLE user_credits ADD COLUMN playground_credits_next_reset timestamp with time zone;
ALTER TABLE user_credits ADD COLUMN metadata jsonb;

-- Indexes for performance
CREATE INDEX idx_user_credits_user_id_active ON user_credits (user_id, is_active);
```

### Computed Properties
- `available_playground_credits`: `playground_credits - playground_credits_used_current_period`
- `available_api_credits`: `api_credits`
- `total_available_credits`: `available_playground_credits + available_api_credits`

## Implementation Structure

```
src/modules/credits/
├── entities/
│   ├── user-credit.entity.ts        # Enhanced user credits entity
│   └── index.ts
├── enums/
│   ├── credit-type.enum.ts          # Credit types and operations
│   └── index.ts
├── interfaces/
│   ├── credit-management.interface.ts # Business logic interfaces
│   └── index.ts
├── dto/
│   ├── credit-balance-response.dto.ts
│   ├── credit-deduction.dto.ts
│   └── index.ts
├── repositories/
│   ├── user-credits.repository.ts    # Data access layer
│   └── index.ts
├── services/
│   ├── credit-management.service.ts  # Core business logic
│   └── index.ts
├── listeners/
│   ├── subscription-events.listener.ts # Event-driven credit updates
│   └── index.ts
├── credits.module.ts
└── index.ts
```

## Key Features

### 1. Atomic Credit Operations
All credit operations use database transactions with row-level locking to prevent race conditions:

```typescript
// Example: Atomic credit deduction
async deductCreditsAtomic(request: CreditDeductionRequest): Promise<Result> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.startTransaction();
  
  try {
    // Lock the record
    const userCredit = await queryRunner.manager
      .createQueryBuilder(UserCredit, 'uc')
      .setLock('pessimistic_write')
      .getOne();
    
    // Perform operations
    // ...
    
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  }
}
```

### 2. Credit Type Auto-Selection
When no specific credit type is specified, the system automatically tries playground credits first, then API credits:

```typescript
// Auto-select credit type
if (!credit_type) {
  if (userCredit.available_playground_credits >= amount) {
    usePlaygroundCredits = true;
  } else if (userCredit.api_credits >= amount) {
    useApiCredits = true;
  } else {
    throw new InsufficientCreditsException();
  }
}
```

### 3. Event-Driven Credit Management
The system listens to subscription events to automatically manage credits:

```typescript
@OnEvent('subscription.cancelled')
async handleSubscriptionCancelled(payload) {
  await this.creditManagementService.handleSubscriptionCancellation(
    payload.userId,
    payload.packageId
  );
}

@OnEvent('payment.succeeded')
async handlePaymentSucceeded(payload) {
  await this.creditManagementService.handleSubscriptionPeriodStart(
    payload.userId,
    payload.packageId,
    now,
    nextMonth
  );
}
```

### 4. Backward Compatibility
The legacy `balance` field is maintained and automatically computed for backward compatibility:

```typescript
// Legacy balance is automatically updated
userCredit.balance = userCredit.total_available_credits;
```

## Usage Examples

### 1. Basic Credit Operations

```typescript
// Get user credit balance
const balance = await creditManagementService.getCreditBalance(userId);

// Deduct credits (auto-select type)
const result = await creditManagementService.deductCredits({
  user_id: userId,
  amount: 100,
  description: 'API call'
});

// Deduct specific credit type
const result = await creditManagementService.deductCredits({
  user_id: userId,
  amount: 50,
  credit_type: CreditType.API,
  description: 'Premium API call'
});
```

### 2. Enhanced Auth Service Usage

```typescript
// For new implementations, use EnhancedAuthService
constructor(
  private readonly enhancedAuthService: EnhancedAuthService
) {}

// Validate API key (returns total balance for compatibility)
const user = await this.enhancedAuthService.validateApiKey(apiKey);

// Deduct credits with new features
const result = await this.enhancedAuthService.deductCredits({
  user_id: userId,
  amount: 150,
  credit_type: CreditType.PLAYGROUND,
  description: 'Video generation'
});

// Get detailed credit information
const detailedBalance = await this.enhancedAuthService.getUserCreditBalance(userId);
```

### 3. Credit Management

```typescript
// Refill user credits
await creditManagementService.refillCredits({
  user_id: userId,
  playground_credits: 1000,
  api_credits: 500,
  source: CreditSource.SUBSCRIPTION_REFILL,
  description: 'Monthly refill'
});

// Reset playground credits (subscription renewal)
await creditManagementService.resetPlaygroundCredits({
  user_id: userId,
  playground_credits: 1000,
  reset_usage_counters: true,
  source: CreditSource.SUBSCRIPTION_RESET,
  description: 'Monthly reset'
});
```

## Subscription Event Flow

### 1. Subscription Creation
1. `subscription.created` event triggered
2. Initial setup (handled by payment.succeeded)

### 2. Payment Success (Monthly Renewal)
1. `payment.succeeded` event triggered
2. Playground credits reset to package allocation
3. Usage counters reset to 0
4. API credits remain untouched
5. Next reset date calculated

### 3. Subscription Cancellation
1. `subscription.cancelled` event triggered
2. Playground credits reset to 0
3. API credits remain untouched
4. Next reset date cleared

## Migration Strategy

### 1. Database Migration
Run the migration to add new columns:
```bash
npm run migration:run
```

### 2. Data Migration
Existing balance data is automatically migrated to `playground_credits` with a migration flag.

### 3. Service Integration
- Keep existing `AuthService` for backward compatibility
- Use `EnhancedAuthService` for new features
- Gradually migrate endpoints to use enhanced service

## API Endpoints

### Enhanced Credit Information
```typescript
// Get detailed credit balance
GET /auth/credits/balance
Response: {
  playground_credits: 1000,
  api_credits: 500,
  available_playground_credits: 750,
  available_api_credits: 500,
  total_available_credits: 1250,
  playground_credits_used_current_period: 250,
  api_credits_used_total: 0
}

// Credit usage report
GET /auth/credits/usage-report
Response: {
  current_period_start: "2025-01-01T00:00:00Z",
  current_period_end: "2025-02-01T00:00:00Z",
  playground_credits_allocated: 1000,
  playground_credits_used: 250,
  playground_credits_remaining: 750,
  api_credits_total: 500,
  api_credits_used_lifetime: 0,
  api_credits_remaining: 500
}
```

## Monitoring and Analytics

### Credit Events
The system emits events for monitoring:
- `credit.deducted`
- `credit.refilled`
- `credit.reset`
- `credit.created`
- `credit.migrated`

### Metadata Tracking
All operations include metadata for audit and analytics:
```typescript
{
  last_deduction: "2025-01-15T10:30:00Z",
  last_deduction_amount: 100,
  last_deduction_type: "playground",
  last_refill: "2025-01-01T00:00:00Z",
  subscription_package_id: 2
}
```

## Testing

### Unit Tests
```typescript
describe('CreditManagementService', () => {
  it('should deduct playground credits first', async () => {
    // Test auto-selection logic
  });
  
  it('should handle subscription cancellation', async () => {
    // Test playground credit reset
  });
  
  it('should preserve API credits on cancellation', async () => {
    // Test API credit persistence
  });
});
```

### Integration Tests
```typescript
describe('Credit System Integration', () => {
  it('should handle complete subscription lifecycle', async () => {
    // Test creation -> renewal -> cancellation flow
  });
});
```

## Performance Considerations

1. **Indexing**: Added indexes on frequently queried columns
2. **Row Locking**: Prevents race conditions in credit operations
3. **Event-Driven**: Reduces coupling between modules
4. **Computed Properties**: Reduces calculation overhead

## Security Considerations

1. **Transaction Safety**: All operations are atomic
2. **Input Validation**: DTOs validate all inputs
3. **Access Control**: Credit operations require proper authentication
4. **Audit Trail**: All operations are logged with metadata

## Future Enhancements

1. **Credit Expiration**: Add expiration dates for promotional credits
2. **Credit Transfers**: Allow users to transfer credits
3. **Usage Analytics**: Detailed usage patterns and forecasting
4. **Credit Packages**: Standalone credit purchase options
5. **Multi-Currency**: Support for different credit currencies

## Troubleshooting

### Common Issues
1. **Migration Errors**: Ensure database permissions are correct
2. **Event Not Firing**: Check EventEmitter configuration
3. **Credit Calculation**: Verify computed property logic
4. **Transaction Deadlocks**: Review lock ordering

### Debug Logs
Enable debug logging for credit operations:
```typescript
this.logger.debug(`Credit operation: ${JSON.stringify(operation)}`);
```

## Conclusion

This implementation provides a robust, scalable credit system that:
- Supports dual credit types with different lifecycle rules
- Maintains backward compatibility
- Uses event-driven architecture for subscription integration
- Provides comprehensive audit trails and monitoring
- Ensures data consistency through atomic operations

The system is production-ready and can easily accommodate future requirements for additional credit types or business rules.