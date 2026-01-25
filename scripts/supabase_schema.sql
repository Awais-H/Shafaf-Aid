-- Enable RLS (Auth users table is managed by Supabase, so we verify RLS on our tables)

-- HELPER FUNCTIONS
-- use security definer to bypass RLS recursion when checking admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('donor','mosque','admin')) not null,
  created_at timestamp with time zone default now()
);
alter table public.profiles enable row level security;

-- DONOR PROFILES
create table if not exists public.donor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text
);
alter table public.donor_profiles enable row level security;

-- MOSQUE PROFILES
create table if not exists public.mosque_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mosque_name text not null,
  website_url text not null,
  country text not null,
  city text not null,
  contact_email text not null,
  short_description text
);
alter table public.mosque_profiles enable row level security;

-- AID REQUESTS
create table if not exists public.aid_requests (
  id uuid primary key default gen_random_uuid(),
  mosque_user_id uuid references auth.users(id) on delete cascade not null,
  purpose_category text check (purpose_category in ('food','orphans','education','medical','shelter','other')) not null,
  purpose_detail text not null,
  urgency_level int check (urgency_level between 1 and 5) not null,
  amount_requested numeric not null,
  needed_by_date date,
  region_focus text,
  supporting_link text,
  status text check (status in ('submitted','approved','rejected')) default 'submitted',
  admin_notes text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
alter table public.aid_requests enable row level security;

-- DONOR PLEDGES
create table if not exists public.donor_pledges (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.aid_requests(id) on delete cascade not null,
  donor_user_id uuid references auth.users(id) on delete cascade not null,
  pledge_amount numeric,
  donor_note text,
  created_at timestamp with time zone default now()
);
alter table public.donor_pledges enable row level security;

-- MAP DATA TABLES (Required for Supabase Data Mode)
create table if not exists public.countries (
  id text primary key, -- utilizing ISO code or similar string ID from HDX
  name text not null,
  iso2 text,
  curated boolean default false,
  centroid_lng float,
  centroid_lat float
);
alter table public.countries enable row level security;

create table if not exists public.regions (
  id text primary key,
  country_id text references public.countries(id) on delete cascade,
  name text not null,
  centroid_lng float,
  centroid_lat float,
  population int,
  need_level text
);
alter table public.regions enable row level security;

create table if not exists public.orgs (
  id text primary key,
  name text not null,
  type text
);
alter table public.orgs enable row level security;

create table if not exists public.aid_edges (
  id text primary key,
  org_id text references public.orgs(id) on delete cascade,
  region_id text references public.regions(id) on delete cascade,
  aid_type text,
  project_count int,
  is_synthetic boolean default false,
  source text
);
alter table public.aid_edges enable row level security;


-- RLS POLICIES

-- profiles
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = user_id);

-- donor_profiles
create policy "Donors can view own profile" on public.donor_profiles
  for select using (auth.uid() = user_id);
create policy "Donors can insert own profile" on public.donor_profiles
  for insert with check (auth.uid() = user_id);
create policy "Donors can update own profile" on public.donor_profiles
  for update using (auth.uid() = user_id);

-- mosque_profiles
create policy "Mosques can view own profile" on public.mosque_profiles
  for select using (auth.uid() = user_id);
create policy "Mosques can insert own profile" on public.mosque_profiles
  for insert with check (auth.uid() = user_id);
create policy "Mosques can update own profile" on public.mosque_profiles
  for update using (auth.uid() = user_id);

-- aid_requests
create policy "Mosques can insert requests" on public.aid_requests
  for insert with check (auth.uid() = mosque_user_id);
  
create policy "Mosques can view own requests" on public.aid_requests
  for select using (auth.uid() = mosque_user_id);

create policy "Mosques can update own submitted requests" on public.aid_requests
  for update using (auth.uid() = mosque_user_id and status = 'submitted');

create policy "Donors and public can view approved requests" on public.aid_requests
  for select using (status = 'approved');

-- donor_pledges
create policy "Donors can insert own pledges" on public.donor_pledges
  for insert with check (auth.uid() = donor_user_id);

create policy "Donors can view own pledges" on public.donor_pledges
  for select using (auth.uid() = donor_user_id);

create policy "Mosques can view pledges for their approved requests" on public.donor_pledges
  for select using (
    exists (
      select 1 from public.aid_requests
      where id = donor_pledges.request_id
      and mosque_user_id = auth.uid()
      and status = 'approved'
    )
  );

-- ADMIN POLICIES (Using infinite-recursion-safe function)

create policy "Admins can view profiles" on public.profiles
  for select using ( is_admin() );

create policy "Admins can view donor profiles" on public.donor_profiles
  for select using ( is_admin() );

create policy "Admins can view mosque profiles" on public.mosque_profiles
  for select using ( is_admin() );

create policy "Admins can view all requests" on public.aid_requests
  for select using ( is_admin() );

create policy "Admins can update requests" on public.aid_requests
  for update using ( is_admin() );

create policy "Admins can view all pledges" on public.donor_pledges
  for select using ( is_admin() );

-- MAP DATA PUBLIC ACCESS
create policy "Public view countries" on public.countries for select using (true);
create policy "Public view regions" on public.regions for select using (true);
create policy "Public view orgs" on public.orgs for select using (true);
create policy "Public view aid_edges" on public.aid_edges for select using (true);
