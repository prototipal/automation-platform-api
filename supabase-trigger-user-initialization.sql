-- Supabase trigger function to initialize new users with free package
-- Bu SQL'i Supabase Dashboard'da SQL Editor'de çalıştırın

-- First, clean up any existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_new_user_setup ON auth.users;

DROP FUNCTION IF EXISTS initialize_new_user();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS create_user_profile();
DROP FUNCTION IF EXISTS setup_new_user();

-- Function to initialize new user with free package
CREATE OR REPLACE FUNCTION initialize_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_package_id INTEGER;
    free_credits INTEGER := 5;
BEGIN
    -- Get free package details
    SELECT id INTO free_package_id 
    FROM public.packages 
    WHERE type = 'free' AND is_active = true 
    LIMIT 1;

    -- Check if free package exists
    IF free_package_id IS NULL THEN
        RAISE EXCEPTION 'Free package not found';
    END IF;

    -- Insert into user_profiles
    INSERT INTO public.user_profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NOW(), 
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Check if user already has credits record
    IF NOT EXISTS (
        SELECT 1 FROM public.user_credits 
        WHERE user_id = NEW.id
    ) THEN
        -- Insert into user_credits with initial free credits
        INSERT INTO public.user_credits (
            user_id, 
            balance,
            playground_credits, 
            api_credits, 
            playground_credits_used_current_period,
            api_credits_used_total,
            is_active,
            metadata,
            created_at, 
            updated_at
        )
        VALUES (
            NEW.id,
            free_credits,  -- balance (legacy)
            free_credits,  -- playground_credits
            0,             -- api_credits  
            0,             -- playground_credits_used_current_period
            0,             -- api_credits_used_total
            true,          -- is_active
            jsonb_build_object(
                'created_by', 'supabase_trigger',
                'initial_playground_credits', free_credits,
                'initial_api_credits', 0
            ),             -- metadata
            NOW(),         -- created_at
            NOW()          -- updated_at
        );
    END IF;

    -- Check if user already has any packages
    IF NOT EXISTS (
        SELECT 1 FROM public.user_packages 
        WHERE user_id = NEW.id AND is_active = true
    ) THEN
        -- Insert into user_packages (assign free package)
        INSERT INTO public.user_packages (
            id,
            user_id,
            package_id,
            status,
            billing_interval,
            current_period_start,
            current_period_end,
            credits_used_current_period,
            generations_current_period,
            cancel_at_period_end,
            is_active,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            NEW.id,
            free_package_id,
            'active',
            'month',
            NOW(),
            NOW() + INTERVAL '1 year', -- Free package valid for 1 year
            0,
            0,
            false,
            true,
            NOW(),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT SELECT ON auth.users TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.user_profiles TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.user_credits TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.user_packages TO anon, authenticated;
GRANT SELECT ON public.packages TO anon, authenticated;