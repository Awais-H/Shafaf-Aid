-- Enable RLS
alter table auth.users enable row level security;

-- PROFILES
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('donor','mosque','admin')) not null,
  created_at timestamp with time zone default now()
);
alter table public.profiles enable row level security;

-- DONOR PROFILES
create table public.donor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text
);
alter table public.donor_profiles enable row level security;

-- MOSQUE PROFILES
create table public.mosque_profiles (
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
create table public.aid_requests (
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
create table public.donor_pledges (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.aid_requests(id) on delete cascade not null,
  donor_user_id uuid references auth.users(id) on delete cascade not null,
  pledge_amount numeric,
  donor_note text,
  created_at timestamp with time zone default now()
);
alter table public.donor_pledges enable row level security;

-- RLS POLICIES

-- profiles
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

-- ADMIN POLICIES (Assuming admin role check via profiles table)
-- Note: Recursive policies can be dangerous, so we'll use a secure function or simpler check if possible.
-- For now, let's assume we can check the role directly from the JWT if using custom claims, 
-- but since we are using a profiles table, we'll maintain a separate admin policy set.

-- Simplified Admin Access (can check if user_id exists in profiles where role='admin')
-- Ideally, use custom claims. For MVP using profiles table lookup:

create policy "Admins can view profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "Admins can view donor profiles" on public.donor_profiles
  for select using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "Admins can view mosque profiles" on public.mosque_profiles
  for select using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "Admins can view all requests" on public.aid_requests
  for select using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "Admins can update requests" on public.aid_requests
  for update using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );

create policy "Admins can view all pledges" on public.donor_pledges
  for select using (
    exists (select 1 from public.profiles where user_id = auth.uid() and role = 'admin')
  );
