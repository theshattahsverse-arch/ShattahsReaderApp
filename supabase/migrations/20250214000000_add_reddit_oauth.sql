-- Reddit OAuth: create a Reddit app at https://www.reddit.com/prefs/apps (type: web app)
-- Set redirect_uri to: https://your-domain.com/auth/reddit/callback (or http://localhost:3000/auth/reddit/callback for local)
-- Add env: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET
--
-- Add 'reddit' to profiles.platform check constraint
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_platform_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_platform_check CHECK (
    platform = ANY (ARRAY[
      'google'::text,
      'email'::text,
      'facebook'::text,
      'apple'::text,
      'x'::text,
      'snapchat'::text,
      'twitch'::text,
      'microsoft'::text,
      'tiktok'::text,
      'discord'::text,
      'reddit'::text
    ])
  );

-- Mapping table for Reddit OAuth: reddit_id -> auth.users.id (so we can find user without listing all users)
CREATE TABLE IF NOT EXISTS public.reddit_user_ids (
  reddit_id text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Optional: allow RLS and policy so only service role / backend can use this table
ALTER TABLE public.reddit_user_ids ENABLE ROW LEVEL SECURITY;

-- Policy: no direct access from anon/authenticated (only server with service role uses this)
CREATE POLICY "Service role only" ON public.reddit_user_ids
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.reddit_user_ids IS 'Maps Reddit user id to Supabase auth user id for Reddit OAuth login.';
