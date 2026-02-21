-- Migration: Create comic_characters table
-- Run this SQL in your Supabase SQL Editor

-- Create comic_characters table
CREATE TABLE IF NOT EXISTS public.comic_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id UUID NOT NULL REFERENCES public.comics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  handle TEXT,
  bio TEXT,
  picture_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for "characters by comic" queries
CREATE INDEX IF NOT EXISTS idx_comic_characters_comic_id ON public.comic_characters(comic_id);
CREATE INDEX IF NOT EXISTS idx_comic_characters_created_at ON public.comic_characters(created_at DESC);

-- Enable RLS
ALTER TABLE public.comic_characters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Characters are viewable by everyone
-- CREATE POLICY "Comic characters are viewable by everyone"
--   ON public.comic_characters FOR SELECT
--   USING (true);

-- -- Admins can insert characters
-- CREATE POLICY "Admins can insert comic characters"
--   ON public.comic_characters FOR INSERT
--   WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.is_admin = true
--     )
--   );

-- -- Admins can update characters
-- CREATE POLICY "Admins can update comic characters"
--   ON public.comic_characters FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.is_admin = true
--     )
--   );

-- -- Admins can delete characters
-- CREATE POLICY "Admins can delete comic characters"
--   ON public.comic_characters FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE profiles.id = auth.uid()
--       AND profiles.is_admin = true
--     )
--   );

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_comic_characters_updated_at ON public.comic_characters;
CREATE TRIGGER update_comic_characters_updated_at
  BEFORE UPDATE ON public.comic_characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.comic_characters IS 'Characters linked to a comic; picture stored in Supabase Storage';
COMMENT ON COLUMN public.comic_characters.picture_path IS 'Storage path in comics bucket, e.g. characters/{id}/picture.jpg';
COMMENT ON COLUMN public.comic_characters.comic_id IS 'Comic this character belongs to';
