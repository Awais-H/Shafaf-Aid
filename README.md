# Shafaf - Global Humanitarian Aid Transparency Platform

<div align="center">

**Connecting donors with verified mosques and organizations to bridge global aid gaps**

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Mapbox](https://img.shields.io/badge/Mapbox-Globe-orange?style=flat-square&logo=mapbox)](https://www.mapbox.com/)

</div>

---

## The Problem

Billions of dollars flow into humanitarian aid annually, yet **critical gaps persist**. Many regions remain underserved while others receive overlapping support. Donors struggle to find verified, trustworthy organizations, and mosques and local institutions lack visibility to attract funding for urgent needs.

**Key challenges we address:**
- **Lack of transparency** – Donors can't easily see where aid is needed most
- **Verification gaps** – No centralized system to verify mosques and organizations
- **Inefficient matching** – Aid doesn't always reach the most underserved areas
- **No visibility for mosques** – Local institutions struggle to reach potential donors

---

## The Solution

**Shafaf** (Arabic for "transparent") is an open platform that:

1. **Visualizes global aid coverage** using interactive globe and map views
2. **Connects verified mosques** with donors through a secure request system
3. **Uses graph theory and analytics** to identify underserved regions
4. **Provides an AI assistant** to help users explore aid data
5. **Enables role-based access** for donors, mosques, and administrators

---

## Who Benefits

| User Type | How Shafaf Helps |
|-----------|------------------|
| **Donors** | Find verified, urgent requests; see exactly where aid is needed globally; track donations |
| **Mosques & Organizations** | Submit aid requests, get verified, reach global donors, track funding |
| **Administrators** | Verify organizations, approve/reject requests, maintain platform integrity |
| **Researchers** | Analyze aid coverage patterns, identify gaps, inform policy decisions |

---

## Features

### Global Aid Visualization
- **Interactive 3D Globe** – See aid coverage worldwide with color-coded need levels
- **2D Map View** – Detailed regional exploration with mosque markers
- **Country Rankings** – List of countries by aid coverage gap percentage

### Role-Based Access Control (RBAC)
- **Donor Dashboard** – Browse requests, record donations, track impact
- **Mosque Dashboard** – Submit aid requests, provide documentation, track status
- **Admin Dashboard** – Verify organizations, approve/reject requests

### AI Assistant (Shafaf Assistant)
- Ask questions about global aid data
- Get recommendations on where to donate
- Powered by Google Gemini

### Mosque Discovery
- Search mosques by location
- View mosque details and active campaigns
- Real-time data from MasjidNear.me API

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Database** | Supabase (PostgreSQL + Row Level Security) |
| **Auth** | Supabase Auth (Email/Password, OAuth) |
| **Maps** | Mapbox GL, react-map-gl, deck.gl |
| **AI** | Google Gemini 2.5 Flash |
| **State** | Zustand |
| **APIs** | REST (Next.js Route Handlers) |

---

## Project Structure

```
shafaf/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/              # Admin dashboard
│   │   ├── donor/              # Donor dashboard & requests
│   │   ├── mosque/             # Mosque dashboard & request forms
│   │   ├── mosques/            # Public mosque discovery
│   │   ├── login/              # Authentication
│   │   ├── onboarding/         # Role selection
│   │   └── api/                # API routes
│   ├── components/
│   │   ├── ai/                 # AI chat components
│   │   ├── auth/               # Auth provider & guards
│   │   ├── layout/             # Header, sidebar, panels
│   │   └── map/                # Globe, MapView, layers
│   ├── core/
│   │   ├── data/               # Supabase client, schema, data loading
│   │   ├── graph/              # Graph algorithms, metrics, ranking
│   │   └── mosques/            # Mosque service layer
│   └── app_state/              # Zustand stores & selectors
├── scripts/                    # Utility scripts
└── public/                     # Static assets
```

---

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)
- Mapbox account (for maps)
- Google AI API key (for AI assistant)

### 1. Clone the Repository

```bash
git clone https://github.com/Awais-H/Shafaf-Aid.git
cd Shafaf-Aid
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Google Gemini AI
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Data Mode (supabase or local)
NEXT_PUBLIC_DATA_MODE=supabase
```

### 4. Set Up Supabase Database

Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Create profile tables
CREATE TABLE donor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT DEFAULT 'donor' CHECK (role = 'donor'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mosque_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mosque_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  short_description TEXT,
  role TEXT DEFAULT 'mosque' CHECK (role = 'mosque'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role = 'admin'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE aid_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  purpose_category TEXT CHECK (purpose_category IN ('food','orphans','education','medical','shelter','other')) NOT NULL,
  purpose_detail TEXT NOT NULL,
  urgency_level INT CHECK (urgency_level BETWEEN 1 AND 5) NOT NULL,
  amount_requested NUMERIC NOT NULL,
  needed_by_date DATE,
  region_focus TEXT,
  supporting_link TEXT,
  status TEXT CHECK (status IN ('submitted','approved','rejected')) DEFAULT 'submitted',
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE donor_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES aid_requests(id) ON DELETE CASCADE NOT NULL,
  donor_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pledge_amount NUMERIC,
  donor_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE donor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aid_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_pledges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (simplified - add more as needed)
CREATE POLICY "Users can view own donor profile" ON donor_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own donor profile" ON donor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own mosque profile" ON mosque_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mosque profile" ON mosque_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Usage Guide

### As a Donor

1. **Sign up** at `/login` and select "Donor"
2. **Browse requests** at `/donor/requests` to see verified aid needs
3. **View details** of any request to see the mosque, urgency, and funding goal
4. **Donate** by clicking the donate button (redirects to mosque's website)
5. **Record your donation** to help track impact

### As a Mosque Representative

1. **Sign up** at `/login` and select "Mosque"
2. **Complete onboarding** with your mosque details
3. **Submit aid requests** through the wizard form
4. **Wait for verification** from administrators
5. **Track your requests** on your dashboard

### Using the AI Assistant

Click the **chat bubble** in the bottom-right corner on any page to:
- Ask about global aid data
- Get recommendations on where to donate
- Learn about countries with highest need

### Exploring the Globe

- **Rotate** the globe by dragging
- **Zoom** with scroll or pinch
- **Click a country** to see detailed regional data
- Use the **sidebar rankings** to quickly navigate

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/masjids/search` | GET | Search mosques by location |
| `/api/nodes` | GET | Get graph data for visualization |
| `/api/region/[regionId]` | GET | Get region details |

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **UmmaHacks** – Hackathon that inspired this project
- **MasjidNear.me** – Mosque location data API
- **Mapbox** – Beautiful map visualization
- **Supabase** – Excellent open-source Firebase alternative
- **Google Gemini** – Powering our AI assistant

---

<div align="center">

**Built with ❤️ for the global community**

[Report Bug](https://github.com/Awais-H/Shafaf-Aid/issues) · [Request Feature](https://github.com/Awais-H/Shafaf-Aid/issues)

</div>
