-- Migration: Add title column to artists table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS title TEXT;

COMMENT ON COLUMN public.artists.title IS 'Artist role or title (e.g. Digital Sculptor, Cover Artist)';
