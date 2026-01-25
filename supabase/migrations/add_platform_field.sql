-- Migration: Add platform field to profiles table
-- Run this SQL in your Supabase SQL Editor

-- Add platform column to track authentication method
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS platform TEXT CHECK (platform IN ('google', 'email'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_platform ON public.profiles(platform);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.platform IS 'Authentication platform used: google (Google OAuth) or email (email/password)';
