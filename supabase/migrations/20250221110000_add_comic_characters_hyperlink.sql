-- Migration: Add hyperlink column to comic_characters
ALTER TABLE public.comic_characters
  ADD COLUMN IF NOT EXISTS hyperlink TEXT;

COMMENT ON COLUMN public.comic_characters.hyperlink IS 'Optional URL for the character (e.g. profile or wiki link)';
