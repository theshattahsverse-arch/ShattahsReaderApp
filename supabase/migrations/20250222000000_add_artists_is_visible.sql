-- Migration: Add is_visible to artists table (show on public Artist page when true)
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.artists.is_visible IS 'When true, artist is shown on the public Artist Spotlight page; when false, hidden.';
