-- ==============================================================================
-- SmartMati City Urban Services Portal - Profile Picture & Avatar SQL Migration
-- Run this SQL in your Supabase Dashboard -> SQL Editor and click RUN
-- ==============================================================================

-- 1. Add avatar_url TEXT column to public.profiles table (stores Cloudinary / hosted image URLs)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Add resident_avatar TEXT column to public.reports table (stores Cloudinary / hosted image URLs)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resident_avatar TEXT;

-- 3. Enable RLS and grant public select/update permissions so avatars display for all accounts
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert profiles for all" ON public.profiles;
CREATE POLICY "Allow insert profiles for all"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update profiles for all" ON public.profiles;
CREATE POLICY "Allow update profiles for all"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 4. Auto sync avatar changes to existing reports
CREATE OR REPLACE FUNCTION public.handle_profile_avatar_sync_to_reports()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    UPDATE public.reports
    SET resident_avatar = NEW.avatar_url
    WHERE user_id = NEW.id OR (resident_email IS NOT NULL AND resident_email = NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_avatar_updated_sync_reports ON public.profiles;
CREATE TRIGGER on_profile_avatar_updated_sync_reports
  AFTER UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_avatar_sync_to_reports();
