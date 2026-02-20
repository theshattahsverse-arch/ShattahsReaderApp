-- Migration: Create artists table
-- Run this SQL in your Supabase SQL Editor

-- Create artists table
CREATE TABLE IF NOT EXISTS public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  picture_path TEXT,
  hyperlink TEXT,
  comic_id UUID REFERENCES public.comics(id) ON DELETE SET NULL DEFAULT NULL,
  social_handle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for "artists by comic" queries
CREATE INDEX IF NOT EXISTS idx_artists_comic_id ON public.artists(comic_id);
CREATE INDEX IF NOT EXISTS idx_artists_created_at ON public.artists(created_at DESC);

-- Enable RLS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Artists are viewable by everyone
CREATE POLICY "Artists are viewable by everyone"
  ON public.artists FOR SELECT
  USING (true);

-- Admins can insert artists
CREATE POLICY "Admins can insert artists"
  ON public.artists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can update artists
CREATE POLICY "Admins can update artists"
  ON public.artists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can delete artists
CREATE POLICY "Admins can delete artists"
  ON public.artists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_artists_updated_at ON public.artists;
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.artists IS 'Artists with optional link to a comic; picture stored in Supabase Storage';
COMMENT ON COLUMN public.artists.picture_path IS 'Storage path in comics bucket, e.g. artists/{id}/picture.jpg';
COMMENT ON COLUMN public.artists.comic_id IS 'Optional comic this artist is associated with; NULL for global roster';
