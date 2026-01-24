-- ShattahsVerse Comic Database Schema
-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- STORAGE BUCKET SETUP INSTRUCTIONS
-- ============================================================================
-- 
-- 1. Create a storage bucket named 'comics' in Supabase Storage
-- 2. Storage structure (simplified - no chapters):
--    comics/
--      {comic_id}/
--        cover.{ext}
--        pages/
--          page-1.{ext}
--          page-2.{ext}
--          ...
--
-- 3. Bucket policies (run these SQL commands after creating the bucket):
--    See STORAGE POLICIES section below for the SQL to create policies
--
-- 4. Example storage paths:
--    - Cover: comics/550e8400-e29b-41d4-a716-446655440000/cover.jpg
--    - Page: comics/550e8400-e29b-41d4-a716-446655440000/pages/page-1.jpg
--
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS PROFILE TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional profile data
-- Auto-created via trigger when user signs up

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  subscription_end_date TIMESTAMPTZ,
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled', 'expired')),
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  paystack_transaction_ref TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMICS TABLE
-- ============================================================================
-- Core comic information with Supabase Storage integration

CREATE TABLE IF NOT EXISTS public.comics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_path TEXT, -- Supabase Storage path: comics/{comic_id}/cover.{ext}
  author TEXT,
  genre TEXT[],
  rating NUMERIC(3,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 10),
  view_count INTEGER DEFAULT 0,
  page_count INTEGER DEFAULT 0, -- Total number of pages (auto-updated by trigger)
  is_premium BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'Ongoing' CHECK (status IN ('Ongoing', 'Completed', 'Hiatus', 'Cancelled')),
  published_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMIC PAGES TABLE
-- ============================================================================
-- Individual pages within comics (simplified structure - no chapters)

CREATE TABLE IF NOT EXISTS public.comic_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id UUID REFERENCES public.comics ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  image_path TEXT NOT NULL, -- Supabase Storage path: comics/{comic_id}/pages/page-{page_number}.{ext}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comic_id, page_number)
);

-- ============================================================================
-- USER FAVORITES TABLE
-- ============================================================================
-- Track user's favorite/bookmarked comics

CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  comic_id UUID REFERENCES public.comics ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comic_id)
);

-- ============================================================================
-- COMIC COMMENTS TABLE
-- ============================================================================
-- User comments on comics or specific pages with support for nested replies
-- page_id is NULL for comic-level comments, or references a specific page

CREATE TABLE IF NOT EXISTS public.comic_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  comic_id UUID REFERENCES public.comics ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES public.comic_pages ON DELETE CASCADE, -- NULL for comic-level comments, UUID for page-level comments
  parent_id UUID REFERENCES public.comic_comments ON DELETE CASCADE, -- For nested replies
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)), -- Optional 1-5 star rating (typically for comic-level comments)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER READING PROGRESS TABLE
-- ============================================================================
-- Track user's reading position in comics (simplified - tracks by page)

CREATE TABLE IF NOT EXISTS public.user_reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  comic_id UUID REFERENCES public.comics ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES public.comic_pages ON DELETE CASCADE NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comic_id)
);

-- ============================================================================
-- ANONYMOUS DAY PASS TABLE
-- ============================================================================
-- Track Day Pass purchases for unauthenticated users using session IDs

CREATE TABLE IF NOT EXISTS public.anonymous_daypass (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('paystack', 'paypal')),
  transaction_ref TEXT,
  user_id UUID REFERENCES public.profiles ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Comics indexes
CREATE INDEX IF NOT EXISTS idx_comics_rating ON public.comics(rating DESC);
CREATE INDEX IF NOT EXISTS idx_comics_created_at ON public.comics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comics_status ON public.comics(status);
CREATE INDEX IF NOT EXISTS idx_comics_is_premium ON public.comics(is_premium);
CREATE INDEX IF NOT EXISTS idx_comics_genre ON public.comics USING GIN(genre);

-- Comic pages indexes
CREATE INDEX IF NOT EXISTS idx_comic_pages_comic_id ON public.comic_pages(comic_id);
CREATE INDEX IF NOT EXISTS idx_comic_pages_page_number ON public.comic_pages(comic_id, page_number);

-- User favorites indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_comic_id ON public.user_favorites(comic_id);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comic_comments_comic_id ON public.comic_comments(comic_id);
CREATE INDEX IF NOT EXISTS idx_comic_comments_page_id ON public.comic_comments(page_id);
CREATE INDEX IF NOT EXISTS idx_comic_comments_user_id ON public.comic_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comic_comments_parent_id ON public.comic_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comic_comments_created_at ON public.comic_comments(comic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comic_comments_page_created_at ON public.comic_comments(page_id, created_at DESC) WHERE page_id IS NOT NULL;

-- Reading progress indexes
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_user_id ON public.user_reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_comic_id ON public.user_reading_progress(comic_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_page_id ON public.user_reading_progress(page_id);

-- Anonymous Day Pass indexes
CREATE INDEX IF NOT EXISTS idx_anonymous_daypass_session_id ON public.anonymous_daypass(session_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_daypass_expires_at ON public.anonymous_daypass(expires_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_daypass_user_id ON public.anonymous_daypass(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comic_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comic_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_daypass ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Comics are viewable by everyone" ON public.comics;
DROP POLICY IF EXISTS "Comic pages are viewable by everyone" ON public.comic_pages;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can add their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comic_comments;
DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comic_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comic_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comic_comments;
DROP POLICY IF EXISTS "Users can view their own reading progress" ON public.user_reading_progress;
DROP POLICY IF EXISTS "Users can insert their own reading progress" ON public.user_reading_progress;
DROP POLICY IF EXISTS "Users can update their own reading progress" ON public.user_reading_progress;
DROP POLICY IF EXISTS "Anonymous Day Pass is viewable by everyone" ON public.anonymous_daypass;
DROP POLICY IF EXISTS "Anonymous Day Pass can be inserted by anyone" ON public.anonymous_daypass;
DROP POLICY IF EXISTS "Anonymous Day Pass can be updated by anyone" ON public.anonymous_daypass;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Comics policies (public read, admin write)
CREATE POLICY "Comics are viewable by everyone"
  ON public.comics FOR SELECT
  USING (true);

-- Comic pages policies (public read, admin write)
CREATE POLICY "Comic pages are viewable by everyone"
  ON public.comic_pages FOR SELECT
  USING (true);

-- User favorites policies
CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON public.user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable by everyone"
  ON public.comic_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own comments"
  ON public.comic_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.comic_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comic_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Reading progress policies
CREATE POLICY "Users can view their own reading progress"
  ON public.user_reading_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading progress"
  ON public.user_reading_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading progress"
  ON public.user_reading_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Anonymous Day Pass policies (public read/write for anonymous purchases)
CREATE POLICY "Anonymous Day Pass is viewable by everyone"
  ON public.anonymous_daypass FOR SELECT
  USING (true);

CREATE POLICY "Anonymous Day Pass can be inserted by anyone"
  ON public.anonymous_daypass FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anonymous Day Pass can be updated by anyone"
  ON public.anonymous_daypass FOR UPDATE
  USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comics_updated_at ON public.comics;
CREATE TRIGGER update_comics_updated_at
  BEFORE UPDATE ON public.comics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comic_comments_updated_at ON public.comic_comments;
CREATE TRIGGER update_comic_comments_updated_at
  BEFORE UPDATE ON public.comic_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update page_count in comics when pages are added/removed
CREATE OR REPLACE FUNCTION public.update_comic_page_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comics
    SET page_count = (
      SELECT COUNT(*) FROM public.comic_pages
      WHERE comic_id = NEW.comic_id
    )
    WHERE id = NEW.comic_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comics
    SET page_count = (
      SELECT COUNT(*) FROM public.comic_pages
      WHERE comic_id = OLD.comic_id
    )
    WHERE id = OLD.comic_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update page_count
DROP TRIGGER IF EXISTS update_page_count_on_insert ON public.comic_pages;
CREATE TRIGGER update_page_count_on_insert
  AFTER INSERT ON public.comic_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comic_page_count();

DROP TRIGGER IF EXISTS update_page_count_on_delete ON public.comic_pages;
CREATE TRIGGER update_page_count_on_delete
  AFTER DELETE ON public.comic_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comic_page_count();

-- Apply updated_at trigger to anonymous_daypass
DROP TRIGGER IF EXISTS update_anonymous_daypass_updated_at ON public.anonymous_daypass;
CREATE TRIGGER update_anonymous_daypass_updated_at
  BEFORE UPDATE ON public.anonymous_daypass
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STORAGE BUCKET POLICIES
-- ============================================================================
-- Run these policies in Supabase SQL Editor after creating the 'comics' bucket
-- These policies allow authenticated users (admins) to upload files

-- Policy: Allow authenticated users to upload files
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comics');

-- Policy: Allow authenticated users to update files
CREATE POLICY IF NOT EXISTS "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'comics');

-- Policy: Allow authenticated users to delete files
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comics');

-- Policy: Allow public read access to all files
CREATE POLICY IF NOT EXISTS "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comics');

-- ============================================================================
-- SAMPLE DATA (Optional - uncomment to use)
-- ============================================================================

-- INSERT INTO public.comics (title, description, cover_image_path, author, genre, rating, status, published_date)
-- VALUES (
--   'Shatteus: Issue 0',
--   'On the streets of JamRock, Mande is caught in the middle of a Superhuman event. His world is turned upside down when he encounters Shattahs a clandestine team of Superhunters tasked with tracking and neutralizing the multiverse greatest threat; Heroes',
--   'comics/550e8400-e29b-41d4-a716-446655440000/cover.jpg',
--   'ShattahsVerse',
--   ARRAY['Action', 'Superhero', 'Sci-Fi'],
--   9.8,
--   'Ongoing',
--   '2025-07-03'
-- );
