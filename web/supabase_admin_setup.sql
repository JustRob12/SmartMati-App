-- ==============================================================================
-- SmartMati City Urban Services Portal - Admin, Profiles & Offices Supabase Setup
-- Paste this script into your Supabase Dashboard -> SQL Editor and click RUN
-- ==============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create or update profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  gender TEXT,
  birthdate TEXT,
  phone TEXT,
  email TEXT UNIQUE,
  city TEXT DEFAULT 'Mati City',
  barangay TEXT,
  purok TEXT,
  role TEXT DEFAULT 'resident',
  avatar_url TEXT,
  verification_status TEXT DEFAULT 'unverified',
  verification_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users and Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles for all" ON public.profiles;
CREATE POLICY "Allow update profiles for all"
  ON public.profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Auto sync auth.users metadata with public.profiles table (ensures avatar & profile sync across devices)
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    gender,
    birthdate,
    city,
    barangay,
    purok,
    role,
    avatar_url,
    verification_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Mati Resident'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'birthdate',
    COALESCE(NEW.raw_user_meta_data->>'city', 'Mati City'),
    COALESCE(NEW.raw_user_meta_data->>'barangay', 'Central (Poblacion)'),
    NEW.raw_user_meta_data->>'purok',
    COALESCE(NEW.raw_user_meta_data->>'role', 'resident'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'avatarUrl'),
    COALESCE(NEW.raw_user_meta_data->>'verification_status', 'unverified')
  )
  ON CONFLICT (id) DO UPDATE SET
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_sync ON auth.users;
CREATE TRIGGER on_auth_user_created_sync
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

-- Trigger to auto-update existing reports avatar whenever a resident updates their profile photo
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

-- 3. Create or update municipal offices & categories table
CREATE TABLE IF NOT EXISTS public.offices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  office_type TEXT NOT NULL,
  purpose TEXT,
  contact_number TEXT,
  email TEXT,
  banner_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure banner_url column exists for existing tables
ALTER TABLE public.offices ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Enable RLS for offices
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Offices are viewable by everyone" ON public.offices;
CREATE POLICY "Offices are viewable by everyone"
  ON public.offices FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert offices for all" ON public.offices;
CREATE POLICY "Allow insert offices for all"
  ON public.offices FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update offices for all" ON public.offices;
CREATE POLICY "Allow update offices for all"
  ON public.offices FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete offices for all" ON public.offices;
CREATE POLICY "Allow delete offices for all"
  ON public.offices FOR DELETE
  USING (true);

-- 4. Seed Official Mati City Offices & Department Types
INSERT INTO public.offices (name, code, office_type, purpose, contact_number, email)
VALUES
  -- 1. Centralized "Catch-All" & Public Order Offices
  ('City Mayor''s Office', 'CMO', 'Centralized & Public Order', 'Receives general community requests, official citizen grievances, or complex complaints that span multiple departments.', '(087) 388-3101', 'cmo@mati.gov.ph'),
  ('Your Local Barangay Hall', 'BRGY', 'Centralized & Public Order', 'Handles all initial neighborhood-level reports, local disputes, minor road repairs, and community cleanliness before escalating them to the city hall.', '0917-000-BRGY', 'barangay@mati.gov.ph'),
  ('Public Safety Office', 'PSO', 'Centralized & Public Order', 'Manages public order, traffic nuisances, or local community disruptions that do not require full police intervention.', '(087) 388-3150', 'pso@mati.gov.ph'),
  ('Hotline 8888 (National Citizens'' Complaint Center)', '8888', 'Centralized & Public Order', 'A national, anonymous phone hotline to report slow local government actions, corruption, or unresolved city hazards.', '8888', 'complaints@8888.gov.ph'),

  -- 2. Infrastructure, Roads, & Utilities
  ('City Engineering Office', 'CEO', 'Infrastructure, Roads, & Utilities', 'Repairs road cracks, potholes, and drainage blockages on local city streets and subdivision roads.', '(087) 388-3140', 'ceo@mati.gov.ph'),
  ('DPWH Davao Oriental 2nd District Engineering Office', 'DPWH', 'Infrastructure, Roads, & Utilities', 'Maintains and repairs major cracks, pits, or damages on national highways (e.g., Mati Diversion Road).', '(087) 811-0234', 'dpwh.davor2@dpwh.gov.ph'),
  ('Mati City Water District (MCWD) / Local Electric Cooperative', 'MCWD/COOP', 'Infrastructure, Roads, & Utilities', 'Resolves broken water main pipes, leaks, low water pressure, or hanging/damaged power lines.', '(087) 388-3200', 'services@mcwd.mati.gov.ph'),

  -- 3. Environment, Trash, & Sanitation
  ('City Environment and Natural Resources Office', 'City ENRO', 'Environment, Trash, & Sanitation', 'Clears massive roadside trash piles, coordinates garbage trucks, and penalizes illegal dumping.', '(087) 388-3160', 'enro@mati.gov.ph'),
  ('City Health Office', 'CHO', 'Environment, Trash, & Sanitation', 'Investigates severe sanitation hazards, foul odors, or pest infestations caused by neglected trash piles near residential areas.', '(087) 388-3121', 'cho@mati.gov.ph'),

  -- 4. Emergencies, Disasters, & Safety
  ('City Disaster Risk Reduction and Management Office', 'CDRRMO', 'Emergencies, Disasters, & Safety', 'Operates 24/7 to clear fallen trees, respond to floods, track extreme weather hazards, and dispatch emergency medical rescues.', '0917-814-6284', 'cdrrmo@mati.gov.ph'),
  ('Philippine National Police - Mati City Station', 'PNP', 'Emergencies, Disasters, & Safety', 'Handles active criminal activities, theft, physical fights, and filing official police blotters.', '0998-598-7254', 'pnp.mati@pnp.gov.ph'),
  ('Bureau of Fire Protection - Mati', 'BFP', 'Emergencies, Disasters, & Safety', 'Extinguishes fires, handles structural collapses, and responds to vehicular accidents.', '(087) 388-3111', 'bfp.mati@bfp.gov.ph'),

  -- 5. Animal Welfare & Health
  ('Office of the City Veterinarian', 'City VET', 'Animal Welfare & Health', 'Manages stray animal impounding, handles pet vaccination schedules, and coordinates local animal health concerns.', '(087) 388-3175', 'vet@mati.gov.ph'),
  ('PNP / Barangay Council (Animal Welfare Act Enforcement)', 'AWA-ENF', 'Animal Welfare & Health', 'Enforces criminal charges and arrests individuals for active animal cruelty or severe abuse cases.', '0998-598-7254', 'animalwelfare@mati.gov.ph')
ON CONFLICT DO NOTHING;

-- 5. Create Default Admin User in Supabase Auth & Profiles
DO $$
DECLARE
  new_admin_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@mati.gov.ph') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud,
      confirmation_token
    ) VALUES (
      new_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@mati.gov.ph',
      crypt('AdminPassword123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Mati City Hall Administrator","role":"admin"}',
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      ''
    );

    INSERT INTO public.profiles (
      id,
      full_name,
      email,
      city,
      barangay,
      role,
      verification_status,
      created_at
    ) VALUES (
      new_admin_id,
      'Mati City Hall Administrator',
      'admin@mati.gov.ph',
      'Mati City',
      'Central (Poblacion)',
      'admin',
      'approved',
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET role = 'admin', verification_status = 'approved';
  ELSE
    UPDATE public.profiles 
    SET role = 'admin', verification_status = 'approved'
    WHERE email = 'admin@mati.gov.ph';
  END IF;
END $$;

-- 6. Create or update reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resident_name TEXT NOT NULL,
  resident_phone TEXT,
  resident_email TEXT,
  barangay TEXT NOT NULL,
  category TEXT NOT NULL,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  office_name TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, in_progress, resolved
  priority TEXT DEFAULT 'medium', -- urgent (ASAP), high, medium (normal), low (minimal)
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure priority and resident_avatar columns exist on existing reports table
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resident_avatar TEXT;
CREATE INDEX IF NOT EXISTS idx_reports_priority ON public.reports(priority);

-- Enable RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reports are viewable by everyone" ON public.reports;
CREATE POLICY "Reports are viewable by everyone"
  ON public.reports FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert reports for all" ON public.reports;
CREATE POLICY "Allow insert reports for all"
  ON public.reports FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update reports for all" ON public.reports;
CREATE POLICY "Allow update reports for all"
  ON public.reports FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete reports for all" ON public.reports;
CREATE POLICY "Allow delete reports for all"
  ON public.reports FOR DELETE
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

-- 7. Seed Sample Citizen Reports across Mati City
INSERT INTO public.reports (
  id,
  resident_name,
  resident_phone,
  resident_email,
  barangay,
  category,
  office_name,
  title,
  description,
  image_url,
  latitude,
  longitude,
  address,
  status,
  created_at
) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Juan Dela Cruz',
    '0917-123-4567',
    'juan.delacruz@gmail.com',
    'Dahican',
    'Infrastructure, Roads, & Utilities',
    'City Engineering Office',
    'Severe Pothole & Road Cracks along Dahican Coastal Road',
    'A deep pothole has formed near the junction after the recent heavy rainfall, posing danger to motorists and tricycle drivers heading to the beach area.',
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
    6.9420,
    126.2480,
    'Purok Baybay, Brgy. Dahican, Mati City',
    'pending',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Maria Santos',
    '0928-876-5432',
    'maria.santos@yahoo.com',
    'Matiao',
    'Infrastructure, Roads, & Utilities',
    'City Engineering Office',
    'Streetlight Outage (3 Consecutive Lamp Posts)',
    'Three solar streetlights along the main provincial road have been inactive for four nights, causing pitch-black darkness for pedestrians.',
    'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80',
    6.9680,
    126.2050,
    'National Highway, Brgy. Matiao, Mati City',
    'pending',
    NOW() - INTERVAL '5 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Pedro Gonzales',
    '0939-555-7890',
    'pedro.g@gmail.com',
    'Central (Poblacion)',
    'Environment, Trash, & Sanitation',
    'City Environment and Natural Resources Office',
    'Uncollected Garbage Pile near Public Market',
    'Accumulated commercial market waste has blocked the pedestrian walkway and is causing strong foul odors near residential stalls.',
    'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
    6.9580,
    126.2180,
    'Rizal Street, Brgy. Central (Poblacion), Mati City',
    'approved',
    NOW() - INTERVAL '1 day'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Elena Ramos',
    '0945-222-3344',
    'elena.ramos@outlook.com',
    'Badas',
    'Emergencies, Disasters, & Safety',
    'City Disaster Risk Reduction and Management Office',
    'Clogged Drainage Canal & Minor Flooding',
    'The main storm drain is choked with silt and debris, causing water to pool up to ankle deep across the barangay road during afternoon rain.',
    'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=800&auto=format&fit=crop&q=80',
    6.9310,
    126.1920,
    'Purok 3, Brgy. Badas, Mati City',
    'approved',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO NOTHING;
