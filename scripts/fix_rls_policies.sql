-- ============================================================================
-- FIX: Supabase RLS Infinite Recursion on 'profiles' Table
-- ============================================================================
-- 
-- PROBLEM: The current RLS policy on 'profiles' table has infinite recursion,
-- meaning the policy references itself (e.g., checking profiles.role to allow
-- access to profiles table). This blocks ALL reads/writes to the table.
--
-- SOLUTION: Drop existing policies and create simple, non-recursive ones.
--
-- RUN THIS IN YOUR SUPABASE SQL EDITOR:
-- ============================================================================

-- Step 1: Disable RLS temporarily to verify table structure
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE donor_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE aid_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE donor_pledges DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies on profiles (to remove the broken ones)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

-- Step 3: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aid_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_pledges ENABLE ROW LEVEL SECURITY;

-- Step 4: Create SIMPLE, NON-RECURSIVE policies for profiles
-- Key: Only use auth.uid() for checks, never reference the profiles table itself!

-- Policy: Users can read their own profile row
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile (if needed)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- DONOR_PROFILES policies (simple)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own donor profile" ON donor_profiles;
DROP POLICY IF EXISTS "Users can insert own donor profile" ON donor_profiles;
DROP POLICY IF EXISTS "Users can update own donor profile" ON donor_profiles;

CREATE POLICY "Users can view own donor profile"
ON donor_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own donor profile"
ON donor_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own donor profile"
ON donor_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- MOSQUE_PROFILES policies (simple)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own mosque profile" ON mosque_profiles;
DROP POLICY IF EXISTS "Users can insert own mosque profile" ON mosque_profiles;
DROP POLICY IF EXISTS "Users can update own mosque profile" ON mosque_profiles;

CREATE POLICY "Users can view own mosque profile"
ON mosque_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mosque profile"
ON mosque_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mosque profile"
ON mosque_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- AID_REQUESTS policies
-- ============================================================================

DROP POLICY IF EXISTS "Mosques can insert own requests" ON aid_requests;
DROP POLICY IF EXISTS "Mosques can view own requests" ON aid_requests;
DROP POLICY IF EXISTS "Donors can view approved requests" ON aid_requests;
DROP POLICY IF EXISTS "Mosques can update own submitted requests" ON aid_requests;

-- Mosque users can insert their own requests
CREATE POLICY "Mosques can insert own requests"
ON aid_requests FOR INSERT
WITH CHECK (auth.uid() = mosque_user_id);

-- Mosque users can view their own requests
CREATE POLICY "Mosques can view own requests"
ON aid_requests FOR SELECT
USING (auth.uid() = mosque_user_id);

-- Donors can view approved requests (public after approval)
CREATE POLICY "Anyone can view approved requests"
ON aid_requests FOR SELECT
USING (status = 'approved');

-- Mosque users can update their own requests only if still 'submitted'
CREATE POLICY "Mosques can update own submitted requests"
ON aid_requests FOR UPDATE
USING (auth.uid() = mosque_user_id AND status = 'submitted');

-- ============================================================================
-- DONOR_PLEDGES policies
-- ============================================================================

DROP POLICY IF EXISTS "Donors can insert pledges" ON donor_pledges;
DROP POLICY IF EXISTS "Donors can view own pledges" ON donor_pledges;

-- Donors can insert pledges
CREATE POLICY "Donors can insert pledges"
ON donor_pledges FOR INSERT
WITH CHECK (auth.uid() = donor_user_id);

-- Donors can view their own pledges
CREATE POLICY "Donors can view own pledges"
ON donor_pledges FOR SELECT
USING (auth.uid() = donor_user_id);

-- ============================================================================
-- VERIFY: After running this, test with the admin viewer or run:
--   SELECT * FROM profiles ORDER BY created_at DESC LIMIT 10;
-- ============================================================================

SELECT 'RLS policies have been reset. Please test signup again.' as result;
