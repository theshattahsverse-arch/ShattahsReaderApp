-- Migration: Create contact_support table
-- Run this SQL in your Supabase SQL Editor

-- Create contact_support table
CREATE TABLE IF NOT EXISTS public.contact_support (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_support_user_id ON public.contact_support(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_support_status ON public.contact_support(status);
CREATE INDEX IF NOT EXISTS idx_contact_support_created_at ON public.contact_support(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_support_email ON public.contact_support(email);

-- Enable RLS
ALTER TABLE public.contact_support ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own contact support requests" ON public.contact_support;
DROP POLICY IF EXISTS "Users can view their own contact support requests" ON public.contact_support;
DROP POLICY IF EXISTS "Admins can view all contact support requests" ON public.contact_support;
DROP POLICY IF EXISTS "Admins can update contact support requests" ON public.contact_support;

-- RLS Policies
-- Allow anyone to insert contact support requests (for anonymous users)
CREATE POLICY "Users can insert their own contact support requests"
  ON public.contact_support FOR INSERT
  WITH CHECK (true);

-- Users can view their own contact support requests
CREATE POLICY "Users can view their own contact support requests"
  ON public.contact_support FOR SELECT
  USING (
    auth.uid() = user_id OR
    user_id IS NULL
  );

-- Admins can view all contact support requests
CREATE POLICY "Admins can view all contact support requests"
  ON public.contact_support FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update contact support requests
CREATE POLICY "Admins can update contact support requests"
  ON public.contact_support FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_contact_support_updated_at
  BEFORE UPDATE ON public.contact_support
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.contact_support IS 'Stores user contact support requests and inquiries';
COMMENT ON COLUMN public.contact_support.user_id IS 'User ID if authenticated, NULL for anonymous submissions';
COMMENT ON COLUMN public.contact_support.status IS 'Status of the support request: pending, in_progress, resolved, or closed';
