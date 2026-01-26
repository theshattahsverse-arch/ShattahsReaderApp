-- Migration: Add comic credits fields to comics table
-- Run this SQL in your Supabase SQL Editor

-- Add new fields to comics table
ALTER TABLE public.comics
  ADD COLUMN IF NOT EXISTS written_by TEXT,
  ADD COLUMN IF NOT EXISTS cover_art TEXT,
  ADD COLUMN IF NOT EXISTS interior_art_lines TEXT,
  ADD COLUMN IF NOT EXISTS interior_art_colors TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.comics.written_by IS 'Name of the writer(s) of the comic';
COMMENT ON COLUMN public.comics.cover_art IS 'Name of the cover artist(s)';
COMMENT ON COLUMN public.comics.interior_art_lines IS 'Name of the interior line artist(s)';
COMMENT ON COLUMN public.comics.interior_art_colors IS 'Name of the interior color artist(s)';
