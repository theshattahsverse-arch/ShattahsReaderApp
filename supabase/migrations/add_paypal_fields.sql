-- Migration: Add PayPal payment fields to profiles table
-- Run this SQL in your Supabase SQL Editor

-- Add PayPal-related fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT CHECK (payment_provider IN ('paystack', 'paypal'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_order_id ON public.profiles(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_paypal_subscription_id ON public.profiles(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_payment_provider ON public.profiles(payment_provider);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.paypal_order_id IS 'PayPal order ID for one-time payments (Day Pass)';
COMMENT ON COLUMN public.profiles.paypal_subscription_id IS 'PayPal subscription ID for recurring subscriptions (Member)';
COMMENT ON COLUMN public.profiles.payment_provider IS 'Payment provider used: paystack (Nigeria) or paypal (International)';
