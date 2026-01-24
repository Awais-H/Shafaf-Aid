# Shafaf Aid (AidGap)

An exploratory analytics platform that uses **graph theory + geospatial visualization** to surface **relative aid coverage mismatches** across regions. Provides decision-support signals for humanitarian coordination analysts.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Features

- **Interactive World Map**: Global view with 5 curated countries showing relative coverage
- **Country Deep Dive**: Regional breakdown with coverage variance analysis  
- **Region Details**: Click any region to see organizations, aid type breakdown, and overlap intensity
- **Pulsing Animations**: High-gap areas pulse red to draw attention
- **Methodology Transparency**: "Explain" drawer shows all formulas, weights, and assumptions
- **Demo Mode**: Works offline with synthetic data

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Mapbox GL JS** for real-world explorable globe/map visualization
- **deck.gl** for high-performance data layers
- **Zustand** for state management
- **Supabase** support for production data (optional)
- **Tailwind CSS** for styling

## Data Modes

### Static Mode (Default)

Uses local JSON files in `/src/data/`. Perfect for demos and offline usage.

```env
NEXT_PUBLIC_DATA_MODE=static
```

### Supabase Mode

Fetches data from Supabase with viewport-based loading and caching.

```env
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Environment Variables

Create a `.env.local` file:

```env
# Data mode: 'static' or 'supabase'
NEXT_PUBLIC_DATA_MODE=static

# Mapbox Access Token (required for globe/map visualization)
# Get your free token at: https://account.mapbox.com/access-tokens/
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_public_token

# Supabase (required only for supabase mode)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Getting a Mapbox Token

1. Create a free account at [mapbox.com](https://account.mapbox.com/)
2. Go to Access Tokens page
3. Copy your default public token or create a new one
4. Add it to `.env.local` as `NEXT_PUBLIC_MAPBOX_TOKEN`

## Demo Script

1. **World View** (`/`): See global coverage overview with 5 highlighted countries
2. **Click a Country**: Routes to `/country/[id]` showing regional breakdown
3. **Click a Region**: Opens side panel with detailed metrics
4. **Click "Explain"**: View methodology, formulas, and data policy

## Key Metrics

### Coverage Index

```
Coverage Index = (Σ Weighted Aid Presence) / (Population × Need Factor)
```

**Aid Type Weights:**
- Food: 1.0
- Medical: 1.2  
- Infrastructure: 0.8

**Need Factors:**
- Low: 0.8
- Medium: 1.0
- High: 1.3

### Normalization

All coverage values are normalized **within the current view** (world or country) for relative comparison.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # World view
│   ├── country/[id]/      # Country view
│   └── api/               # API routes (Supabase mode)
├── app_state/             # Zustand store + selectors
├── components/
│   ├── layout/            # Header, SidePanel, Legend, etc.
│   ├── map/               # MapView, Layers, utils
│   └── ui/                # Reusable UI components
├── core/
│   ├── data/              # Schema, data loading, Supabase client
│   └── graph/             # Metrics engine (pure TypeScript)
└── data/                  # Static JSON data files
```

## Supabase Schema

If using Supabase mode, create these tables:

```sql
-- Countries table
CREATE TABLE countries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  iso2 CHAR(2) NOT NULL,
  curated BOOLEAN DEFAULT false,
  centroid_lng FLOAT,
  centroid_lat FLOAT
);

-- Regions table
CREATE TABLE regions (
  id TEXT PRIMARY KEY,
  country_id TEXT REFERENCES countries(id),
  name TEXT NOT NULL,
  centroid_lng FLOAT,
  centroid_lat FLOAT,
  population INTEGER,
  need_level TEXT CHECK (need_level IN ('low', 'medium', 'high'))
);

-- Organizations table
CREATE TABLE orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT
);

-- Aid edges table
CREATE TABLE aid_edges (
  id TEXT PRIMARY KEY,
  org_id TEXT REFERENCES orgs(id),
  region_id TEXT REFERENCES regions(id),
  aid_type TEXT CHECK (aid_type IN ('food', 'medical', 'infrastructure')),
  project_count INTEGER DEFAULT 1,
  is_synthetic BOOLEAN DEFAULT true,
  source TEXT
);

-- Indexes for performance
CREATE INDEX idx_regions_country ON regions(country_id);
CREATE INDEX idx_regions_centroid ON regions(centroid_lng, centroid_lat);
CREATE INDEX idx_aid_edges_region ON aid_edges(region_id);
CREATE INDEX idx_aid_edges_org ON aid_edges(org_id);

-- RLS policies (permissive for demo)
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aid_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON countries FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON regions FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON orgs FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON aid_edges FOR SELECT USING (true);
```

## Offline Mode

The static demo mode works without any network connectivity (once loaded). For fully offline operation including map tiles:

1. Set up a local tile server
2. Update `NEXT_PUBLIC_MAP_TILES_URL` to point to local tiles
3. Or use the built-in fallback that shows a simplified map

## Performance

- **Viewport-based loading**: Only loads data for visible regions (Supabase mode)
- **In-memory caching**: Reduces redundant queries
- **Efficient rendering**: deck.gl handles 50k+ points smoothly
- **Animation optimization**: requestAnimationFrame for smooth pulse/glow effects

## Limitations & Disclaimers

⚠️ **This tool uses synthetic demo data** and is not intended for operational decisions.

- Coverage indices are **relative** and **normalized** within views
- Does not account for access constraints, funding cycles, or local capacity  
- Organization data is simplified/fictional
- Population figures are approximations

## License

MIT

## Credits

Built for humanitarian coordination research and demonstration purposes.
