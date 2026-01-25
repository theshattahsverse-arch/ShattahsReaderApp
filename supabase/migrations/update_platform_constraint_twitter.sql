-- Migration: Update platform constraint to include Twitter/X
-- Run this SQL in your Supabase SQL Editor if the platform column already exists

-- Drop existing constraint if it exists
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_platform_check;

-- Add updated constraint to include twitter
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_platform_check 
CHECK (platform IN ('google', 'email', 'facebook', 'twitter'));

-- Update comment for documentation
COMMENT ON COLUMN public.profiles.platform IS 'Authentication platform used: google (Google OAuth), email (email/password), facebook (Facebook OAuth), or twitter (Twitter/X OAuth)';
