-- Create packages table
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) UNIQUE NOT NULL CHECK (type IN ('free', 'basic', 'pro', 'ultimate')),
    description TEXT,
    monthly_price_cents INTEGER NOT NULL DEFAULT 0,
    yearly_price_cents INTEGER NOT NULL DEFAULT 0,
    stripe_monthly_price_id VARCHAR(255),
    stripe_yearly_price_id VARCHAR(255),
    monthly_credits INTEGER NOT NULL DEFAULT 0,
    max_generations_per_month INTEGER,
    features JSONB,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for packages
CREATE INDEX IF NOT EXISTS idx_package_type ON packages(type);
CREATE INDEX IF NOT EXISTS idx_package_is_active ON packages(is_active);

-- Create user_packages table
CREATE TABLE IF NOT EXISTS user_packages (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    package_id INTEGER NOT NULL,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'unpaid', 'trialing')),
    billing_interval VARCHAR(10) CHECK (billing_interval IN ('month', 'year')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    credits_used_current_period INTEGER NOT NULL DEFAULT 0,
    generations_current_period INTEGER NOT NULL DEFAULT 0,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_packages
CREATE INDEX IF NOT EXISTS idx_user_package_user_id ON user_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_package_status ON user_packages(status);
CREATE INDEX IF NOT EXISTS idx_user_package_stripe_subscription ON user_packages(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_package_active_subscription ON user_packages(user_id, status, is_active);

-- Create foreign key constraint
ALTER TABLE user_packages 
ADD CONSTRAINT fk_user_packages_package_id 
FOREIGN KEY (package_id) REFERENCES packages(id) 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Insert default packages
INSERT INTO packages (name, type, description, monthly_price_cents, yearly_price_cents, monthly_credits, max_generations_per_month, features, priority, is_active, is_default) 
VALUES 
('Free Plan', 'free', 'Get started with basic features', 0, 0, 100, 50, '{"api_access": false, "priority_support": false, "advanced_models": [], "max_resolution": "HD", "commercial_license": false}', 1, true, true),
('Basic Plan', 'basic', 'Perfect for individuals and small projects', 999, 9999, 500, 250, '{"api_access": true, "priority_support": false, "advanced_models": ["KLING_V2_1"], "max_resolution": "HD", "commercial_license": true}', 2, true, false),
('Pro Plan', 'pro', 'Ideal for professionals and growing businesses', 2999, 29999, 2000, 1000, '{"api_access": true, "priority_support": true, "advanced_models": ["KLING_V2_1", "PIKA_V2"], "max_resolution": "4K", "commercial_license": true}', 3, true, false),
('Ultimate Plan', 'ultimate', 'Maximum power for enterprises and heavy users', 9999, 99999, 10000, null, '{"api_access": true, "priority_support": true, "advanced_models": ["KLING_V2_1", "PIKA_V2", "RUNWAY_V3"], "max_resolution": "4K", "commercial_license": true, "unlimited_generations": true}', 4, true, false)
ON CONFLICT (type) DO NOTHING;

-- Update migrations table
INSERT INTO migrations (timestamp, name) VALUES 
(1755721796056, 'CreatePackagesTable1755721796056'),
(1755721802017, 'CreateUserPackagesTable1755721802017')
ON CONFLICT (timestamp) DO NOTHING;