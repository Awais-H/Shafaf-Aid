# Cursor Prompt: RBAC + Auth + Mosque Request Workflow

> Copy everything below this line and paste into Cursor.

---

You are building a secure RBAC + Auth + Requests workflow for an existing Next.js (App Router) + TypeScript app using Supabase.

## GOAL
Add authentication and role-based access for:
- **Donor users** (browse + donate)
- **Mosque users** (submit aid requests + track status)
- **Admin users** (approve/reject requests, add notes)

## CRITICAL SECURITY REQUIREMENT
Do NOT rely on frontend-only role checks. Enforce access using **Supabase Postgres Row Level Security (RLS)** policies. Any sensitive data MUST be protected via RLS.

## TECH STACK
- Next.js App Router (existing project)
- TypeScript
- Supabase (Auth + Postgres + RLS)
- UI: use existing components styling in the repo (Tailwind present); keep UI simple and shippable.
- No external auth libraries (use supabase-js)
- Store secrets in `.env.local`

---

## FEATURES TO IMPLEMENT

### 1) AUTH FLOWS
- Create `/login` page:
  - Email + password login
  - Email + password signup
  - Clear error states
- After signup, user must select role: donor or mosque.
  - Role selection occurs only once (onboarding page).
  - Store role in DB and prevent changes without admin.
- Add signout button in header for authenticated users.

### 2) USER ROLES + PROFILES
- Roles: `'donor' | 'mosque' | 'admin'`
- `profiles` table with `user_id` and `role`
- **Donor profile fields** (minimal for MVP):
  - `display_name` (optional)
- **Mosque profile fields**:
  - `mosque_name`
  - `website_url`
  - `country`
  - `city`
  - `contact_email`
  - optional: `short_description`
- Ensure each user sees only their own profile.

### 3) MOSQUE "REQUEST" SUBMISSION (wizard / slides)
- Create `/mosque/request/new`
- Wizard form: questions one-by-one (like slides), with Next/Back, progress indicator.
- **Questions** (store in DB):
  - `purpose_category` (enum): food, orphans, education, medical, shelter, other
  - `purpose_detail` (text)
  - `urgency_level` (1-5)
  - `amount_requested` (numeric, currency not enforced)
  - `needed_by_date` (date)
  - `region_focus` (text: city/area)
  - `supporting_link` (url optional)
- On submit, create a "request" row with `status='submitted'`.

**Mosque dashboard `/mosque`**
- Show list of their requests
- Each request shows: status, created_at, urgency, amount, purpose
- Request detail page shows admin decision + donation summary **ONLY after approved**:
  - `approved_at`, `admin_notes`
  - donor_activity summary (total pledged/recorded and any donor notes)

> IMPORTANT: mosques must ONLY see THEIR requests (enforced by RLS)

### 4) DONOR EXPERIENCE
**Donor dashboard `/donor`**
- Button: "Browse urgent requests"
- Page `/donor/requests`:
  - list **approved requests ONLY**
  - sort by `urgency_level` desc then `needed_by_date` asc
  - filters optional: country, category
- Request detail: show mosque name, website, purpose, urgency, amount, needed_by_date
- **Donate button**:
  - link to `mosque.website_url` (open new tab)
  - Before redirect, optionally create a "pledge" record in DB:
    - `donor_id`, `request_id`, `pledge_amount` (optional input), `donor_note` (optional), `created_at`
  - Show a confirmation screen (no payment processing in-app).

### 5) ADMIN EXPERIENCE (minimal but necessary)
**Admin dashboard `/admin`**
- List requests with `status='submitted'`
- Admin can approve or reject
- On approve:
  - set `status='approved'`, `approved_at` timestamp, `admin_notes` text
- On reject:
  - `status='rejected'`, `admin_notes` required
- Only admin can do this (RLS).

---

## DATABASE SCHEMA (Supabase SQL)

Create these tables:

### A) profiles
```sql
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('donor','mosque','admin')) not null,
  created_at timestamp default now()
);
```

### B) donor_profiles
```sql
create table donor_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text
);
```

### C) mosque_profiles
```sql
create table mosque_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mosque_name text not null,
  website_url text not null,
  country text not null,
  city text not null,
  contact_email text not null,
  short_description text
);
```

### D) aid_requests
```sql
create table aid_requests (
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
  approved_at timestamp,
  created_at timestamp default now()
);
```

### E) donor_pledges
```sql
create table donor_pledges (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references aid_requests(id) on delete cascade not null,
  donor_user_id uuid references auth.users(id) on delete cascade not null,
  pledge_amount numeric,
  donor_note text,
  created_at timestamp default now()
);
```

---

## RLS POLICIES (must implement)

Enable RLS on all tables and implement policies:

### profiles:
- select/update/insert: user can only access their own row
- admin can select all

### donor_profiles:
- user can select/insert/update their own
- admin can select all

### mosque_profiles:
- user can select/insert/update their own
- admin can select all

### aid_requests:
- mosque can insert for themselves
- mosque can select their own requests
- mosque can update their own requests ONLY if `status='submitted'` (no editing after approved/rejected)
- donors can select ONLY approved requests
- admin can select all
- admin can update status/admin_notes/approved_at for any row

### donor_pledges:
- donor can insert/select their own pledges
- mosque can select pledges ONLY for requests that belong to them AND only if request `status='approved'`
- admin can select all

---

## AUTH / ONBOARDING LOGIC
- After signup, redirect to `/onboarding/role`
- Role selection writes `profiles.role` and creates appropriate `donor_profiles` or `mosque_profiles` row
- Prevent accessing `/donor/*` unless `role=donor`
- Prevent accessing `/mosque/*` unless `role=mosque`
- Prevent accessing `/admin/*` unless `role=admin`
- Use server-side protection where possible (middleware) plus client checks.

---

## IMPLEMENTATION REQUIREMENTS
- Use a single Supabase client helper:
  - server client for server components/routes
  - browser client for client components
- Add route handlers under `src/app/api` as needed:
  - `POST /api/requests` (create request)
  - `POST /api/admin/requests/[id]/approve`
  - `POST /api/admin/requests/[id]/reject`
  - `POST /api/pledges` (create pledge)

Prefer direct supabase calls from server actions/route handlers to keep keys safe.

---

## FILES TO CREATE/EDIT (be explicit)
- `src/core/data/supabaseClient.ts` (or reuse existing) provide:
  - `createBrowserClient()`
  - `createServerClient()`
- `src/middleware.ts` to protect role routes (read role from DB via server call or JWT claims if you add them)
- `src/app/login/page.tsx`
- `src/app/onboarding/role/page.tsx`
- `src/app/donor/page.tsx`
- `src/app/donor/requests/page.tsx`
- `src/app/donor/requests/[id]/page.tsx`
- `src/app/mosque/page.tsx`
- `src/app/mosque/request/new/page.tsx` (wizard)
- `src/app/mosque/requests/[id]/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/requests/[id]/page.tsx`
- `src/components/auth/*` (login form, role guard, etc. if needed)
- SQL migration file under `/scripts` or `/supabase/migrations` with full schema + RLS policies

---

## UX REQUIREMENTS
- Keep UI minimal but clear
- Show loading states
- Show friendly errors when not authorized (redirect to login)
- Wizard form must store partial state client-side until submit

---

## OUTPUT FORMAT
1) Provide the SQL schema + RLS policies as a single migration file content.
2) Provide the Next.js code changes with full file contents for each created/modified file.
3) Provide step-by-step setup instructions:
   - Supabase project setup
   - env vars required
   - how to run locally
4) Include a quick test plan:
   - create donor, create mosque, create admin
   - submit request
   - approve as admin
   - see request in donor list
   - mosque sees approved + pledge summary

---

## DO NOT
- Do not implement payment processing
- Do not weaken RLS to "make it work"
- Do not store role only in localStorage
- Do not require scraping for anything

## ASSUME
The app already has a world map view. Keep it. Just add these new routes and integrate navigation links in existing header.
