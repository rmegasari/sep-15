-- Migration script to consolidate user_settings into profiles table
-- Add settings columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'id';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'light';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payroll_date INTEGER DEFAULT 28 CHECK (payroll_date >= 1 AND payroll_date <= 31);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS budget_warning_threshold INTEGER DEFAULT 80 CHECK (budget_warning_threshold >= 50 AND budget_warning_threshold <= 100);

-- Migrate data from user_settings to profiles if user_settings table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        -- Update profiles with data from user_settings
        UPDATE profiles 
        SET 
            language = COALESCE(us.language, profiles.language),
            theme = COALESCE(us.theme, profiles.theme),
            payroll_date = COALESCE(us.payroll_date, profiles.payroll_date),
            budget_warning_threshold = COALESCE(us.budget_warning_threshold, profiles.budget_warning_threshold),
            updated_at = NOW()
        FROM user_settings us 
        WHERE profiles.id = us.id;
        
        -- Drop user_settings table after migration
        DROP TABLE IF EXISTS user_settings CASCADE;
        
        RAISE NOTICE 'Successfully migrated user_settings to profiles table';
    ELSE
        RAISE NOTICE 'user_settings table does not exist, skipping migration';
    END IF;
END $$;

-- Ensure all existing profiles have default settings values
UPDATE profiles 
SET 
    language = COALESCE(language, 'id'),
    theme = COALESCE(theme, 'light'),
    payroll_date = COALESCE(payroll_date, 28),
    budget_warning_threshold = COALESCE(budget_warning_threshold, 80),
    updated_at = NOW()
WHERE language IS NULL OR theme IS NULL OR payroll_date IS NULL OR budget_warning_threshold IS NULL;
