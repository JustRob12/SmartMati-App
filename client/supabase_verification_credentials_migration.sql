-- ==============================================================================
-- SmartMati City Urban Services Portal - Verification Credentials Migration
-- Run this SQL in your Supabase Dashboard -> SQL Editor and click RUN
-- ==============================================================================

-- 1. Add verification document columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS residency_cert_url TEXT;

-- 2. Add verification document columns to public.user_verifications (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_verifications') THEN
    ALTER TABLE public.user_verifications ADD COLUMN IF NOT EXISTS id_type TEXT;
    ALTER TABLE public.user_verifications ADD COLUMN IF NOT EXISTS id_photo_url TEXT;
    ALTER TABLE public.user_verifications ADD COLUMN IF NOT EXISTS residency_cert_url TEXT;
  END IF;
END $$;
