# Real Data Implementation Guide - amaan2 Branch

## Overview

This branch (`amaan2`) uses **100% real humanitarian data** sourced from HDX HAPI (Humanitarian Data Exchange - Humanitarian API). This document explains the complete data architecture, sources, scripts, and implementation details needed to recreate this exact setup in the main branch.

---

## 📊 Data Sources

### Primary Source: HDX HAPI (Humanitarian Data Exchange)

The real data comes from three standardized HAPI global CSV datasets:

1. **Operational Presence (3W - Who, What, Where)**
   - URL: `https://data.humdata.org/dataset/5b89fc55-586d-485f-8526-3c7a9a1b0d90/resource/e3a18c4c-ec1b-457e-9f60-cee283c04e0c/download/hdx_hapi_operational_presence_global.csv`
   - Contains: Organization names, regions, sectors, activity types
   - Used for: Organizations, Aid Edges (org-region linkages)

2. **Population Data**
   - URL: `https://data.humdata.org/dataset/9b2e1d5b-0d0b-49a7-9668-c8f5e2ee9081/resource/7c19c43f-c9ee-4039-a0cd-99b3914eff1b/download/hdx_hapi_population_global_hrp.csv`
   - Contains: Population counts per administrative region
   - Used for: Region population data

3. **Humanitarian Needs**
   - URL: `https://data.humdata.org/dataset/5ebd91f3-91e0-4ebf-828f-7d93b26977c1/resource/45036735-305b-42ae-9aef-b941d6dcb6d6/download/hdx_hapi_humanitarian_needs_global_2025.csv`
   - Contains: Population in need per region
   - Used for: Calculating need levels (low/medium/high)

### Country-Specific Overrides

Some countries have custom data sources:
- **Bangladesh**: Custom Rohingya response dataset
- **Palestine**: Custom OPT 3W operational presence dataset

---

## 🔧 Data Ingestion Script

### File: `scripts/ingest_humanitarian_data.ts`

**Purpose**: Fetches real data from HDX HAPI, processes it, and generates JSON files.

**How it works**:
1. Downloads the three global HAPI CSV files
2. For each configured country:
   - Filters population data by country ISO3 code
   - Filters needs data by country ISO3 code
   - Filters operational presence data (with fuzzy matching)
   - Uses country-specific override URLs if available
3. Processes regions:
   - Extracts admin1/admin2 names from presence data
   - Joins with population data
   - Calculates need level from needs ratio (population_in_need / population)
   - Generates synthetic centroids (approximate coordinates)
4. Processes organizations:
   - Extracts org names and types from presence data
   - Creates unique org IDs
5. Processes aid edges:
   - Maps sector names to aid types (food/medical/infrastructure)
   - Creates linkages between orgs and regions
   - Marks all edges as `isSynthetic: false` with source `'hdx_hapi'`

**Countries Processed**:
- Somalia (SOM)
- Bangladesh (BGD)
- Yemen (YEM)
- South Sudan (SSD)
- Afghanistan (AFG)
- Palestine (PSE)

**Output Files** (written to `public/data/`):
- `countries.json` - Country metadata
- `regions.json` - Region data with population and need levels
- `orgs.json` - Organization names and types
- `aid_edges.json` - Org-region linkages with aid types
- `meta.json` - Metadata about the ingestion

**Usage**:
```bash
npx ts-node --esm scripts/ingest_humanitarian_data.ts
```

**Current Stats** (from meta.json):
- 6 countries
- 97 regions
- 879 organizations
- 21,752 aid edges

---

## 📁 Data Files Structure

### Location: `public/data/`

All generated JSON files are served statically from the `public/data/` directory.

#### `countries.json`
```typescript
[
  {
    "id": "somalia",
    "name": "Somalia",
    "iso2": "SO",
    "curated": true,
    "centroid": [45.0, 6.0]
  },
  // ...
]
```

#### `regions.json`
```typescript
[
  {
    "id": "somalia_banadir",
    "countryId": "somalia",
    "name": "Banadir",
    "centroid": [45.0, 6.0],
    "population": 1500000,
    "needLevel": "high"
  },
  // ...
]
```

#### `orgs.json`
```typescript
[
  {
    "id": "org_unicef",
    "name": "UNICEF",
    "type": "UN"
  },
  // ...
]
```

#### `aid_edges.json`
```typescript
[
  {
    "id": "edge_0",
    "orgId": "org_unicef",
    "regionId": "somalia_banadir",
    "aidType": "medical",
    "projectCount": 1,
    "isSynthetic": false,
    "source": "hdx_hapi"
  },
  // ...
]
```

#### `meta.json`
```typescript
{
  "updated": "2026-01-24T23:41:43.427Z",
  "source": "HDX HAPI / Unified Humanitarian Standards",
  "stats": {
    "countries": 6,
    "regions": 97,
    "orgs": 879,
    "edges": 21752
  }
}
```

---

## 🔄 Data Loading System

### File: `src/core/data/loadData.ts`

**Dual-Mode System**: Supports both static JSON files and Supabase database.

#### Data Mode Selection

Controlled by environment variable:
```env
NEXT_PUBLIC_DATA_MODE=static  # or 'supabase'
```

Default: `static` (uses JSON files)

#### Static Mode (Current Implementation)

**Function**: `loadStaticData()`
- Fetches JSON files from `/data/` (served from `public/data/`)
- Caches data in memory (`staticDataCache`)
- Validates data using `validateAppData()`
- Sanitizes for demo using `sanitizeForDemo()`
- Returns `AppData` object

**Flow**:
1. Check cache → return if exists
2. Fetch all 4 JSON files in parallel
3. Validate data structure
4. Sanitize (filter invalid entries)
5. Cache and return

#### Supabase Mode (Optional)

**Function**: `loadSupabaseData()`
- Connects to Supabase using `getSupabaseClient()`
- Queries tables: `countries`, `regions`, `orgs`, `aid_edges`
- Transforms snake_case DB fields to camelCase app schema
- Sanitizes and returns

**Viewport-Based Loading**: `loadSupabaseDataByViewport()`
- Loads only regions within map viewport bounds
- Caches results (1 minute TTL)
- More efficient for large datasets

#### Unified Loader

**Function**: `loadAppData()`
- Checks `NEXT_PUBLIC_DATA_MODE`
- Routes to appropriate loader
- Used throughout the app

**Function**: `loadCountryData(countryId)`
- Filters full dataset to single country
- Used in country detail pages

---

## 🗄️ Database Schema (Optional - Supabase)

### File: `scripts/supabase_schema.sql`

If using Supabase mode, the database has these tables:

#### `countries`
```sql
- id (text, primary key)
- name (text)
- iso2 (text)
- curated (boolean)
- centroid_lng (numeric)
- centroid_lat (numeric)
```

#### `regions`
```sql
- id (text, primary key)
- country_id (text, foreign key)
- name (text)
- centroid_lng (numeric)
- centroid_lat (numeric)
- population (numeric)
- need_level (text: 'low'|'medium'|'high')
```

#### `orgs`
```sql
- id (text, primary key)
- name (text)
- type (text, optional)
```

#### `aid_edges`
```sql
- id (text, primary key)
- org_id (text, foreign key)
- region_id (text, foreign key)
- aid_type (text: 'food'|'medical'|'infrastructure')
- project_count (numeric)
- is_synthetic (boolean)
- source (text, optional)
```

**Note**: The schema also includes user/auth tables for donor/mosque features, but those are separate from the humanitarian data.

---

## 🔌 API Routes

### File: `src/app/api/nodes/route.ts`

**Endpoint**: `GET /api/nodes`

**Purpose**: Fetch data filtered by viewport bounds (for map optimization)

**Query Parameters**:
- `minLng`, `maxLng`, `minLat`, `maxLat` - Viewport bounds
- `zoom` - Map zoom level
- `countryId` (optional) - Filter by country

**Behavior**:
- **Supabase mode**: Queries regions within bounds, then fetches related countries/orgs/edges
- **Static mode**: Loads all data, filters regions by bounds client-side

**Returns**:
```json
{
  "countries": [...],
  "regions": [...],
  "organizations": [...],
  "aidEdges": [...],
  "viewport": { minLng, maxLng, minLat, maxLat, zoom }
}
```

### File: `src/app/api/region/[regionId]/route.ts`

**Endpoint**: `GET /api/region/[regionId]`

**Purpose**: Fetch detailed region information

**Behavior**:
- **Supabase mode**: Queries region, country, edges, orgs from DB
- **Static mode**: Uses `getRegionDetail()` from metrics

**Returns**: Region detail with organizations, aid types, coverage metrics

---

## 📐 Data Schema & Types

### File: `src/core/data/schema.ts`

**Core Types**:

```typescript
interface Country {
  id: string;
  name: string;
  iso2: string;
  curated: boolean;
  centroid: [number, number]; // [lng, lat]
}

interface Region {
  id: string;
  countryId: string;
  name: string;
  centroid: [number, number];
  population: number;
  needLevel: 'low' | 'medium' | 'high';
}

interface Organization {
  id: string;
  name: string;
  type?: string;
}

interface AidEdge {
  id: string;
  orgId: string;
  regionId: string;
  aidType: 'food' | 'medical' | 'infrastructure';
  projectCount: number;
  isSynthetic: boolean;  // Always false for real data
  source?: string;        // 'hdx_hapi' for real data
}

interface AppData {
  countries: Country[];
  regions: Region[];
  organizations: Organization[];
  aidEdges: AidEdge[];
}
```

---

## ✅ Data Validation & Sanitization

### File: `src/core/graph/sanityChecks.ts`

**Validation Functions**:
- `validateCountry()` - Checks required fields
- `validateRegion()` - Checks required fields + needLevel enum
- `validateOrganization()` - Checks required fields
- `validateAidEdge()` - Checks required fields + aidType enum
- `validateAppData()` - Validates entire dataset + referential integrity

**Sanitization**:
- `sanitizeForDemo()` - Filters invalid entries, ensures referential integrity
- Removes regions without valid countries
- Removes edges without valid orgs/regions

**Safety Functions**:
- `safeDiv()` - Prevents divide-by-zero
- `clamp()` - Clamps values to ranges
- `assertValidNumber()` - Validates numeric values

---

## 🎯 Component Integration

### How Components Use Data

#### Main Page (`src/app/page.tsx`)
```typescript
useEffect(() => {
  const data = await loadAppData();  // Automatically uses correct mode
  setAppData(data);
  const scores = computeWorldScores(data);
  setWorldScores(scores);
}, []);
```

#### Country Page (`src/app/country/[countryId]/page.tsx`)
```typescript
const data = await loadAppData();
const countryData = await loadCountryData(countryId);
const scores = computeCountryScores(countryId, data);
```

#### Map Components
- Use data from Zustand store (`useViewStore`)
- Data is loaded once, stored globally
- Map points computed from stored data

---

## 🔧 Configuration

### Environment Variables

**Required for Static Mode** (default):
```env
# No variables needed - uses JSON files from public/data/
```

**Required for Supabase Mode**:
```env
NEXT_PUBLIC_DATA_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Package Dependencies

**Required**:
- `@supabase/supabase-js` (optional, only for Supabase mode)
- `node-fetch` (for ingestion script)
- `ts-node` (for running ingestion script)

**Already in package.json**:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "ts-node": "^10.9.2"
  }
}
```

---

## 📋 Migration Checklist: Main Branch → Real Data

### Step 1: Copy Data Infrastructure Files

Copy these files from `amaan2` branch to `main`:

1. **Data Loading**:
   - `src/core/data/loadData.ts` ✅
   - `src/core/data/schema.ts` ✅
   - `src/core/data/supabaseClient.ts` ✅

2. **Data Ingestion**:
   - `scripts/ingest_humanitarian_data.ts` ✅
   - `scripts/supabase_schema.sql` (if using Supabase)

3. **Data Validation**:
   - `src/core/graph/sanityChecks.ts` ✅

4. **API Routes**:
   - `src/app/api/nodes/route.ts` ✅
   - `src/app/api/region/[regionId]/route.ts` ✅

### Step 2: Generate Real Data Files

```bash
# Run the ingestion script
npx ts-node --esm scripts/ingest_humanitarian_data.ts

# This will generate:
# - public/data/countries.json
# - public/data/regions.json
# - public/data/orgs.json
# - public/data/aid_edges.json
# - public/data/meta.json
```

### Step 3: Update Components

**Replace all mock data loading with**:
```typescript
import { loadAppData } from '@/core/data/loadData';

// In component:
const data = await loadAppData();
```

**Files to update**:
- `src/app/page.tsx` - Already uses `loadAppData()` ✅
- `src/app/country/[countryId]/page.tsx` - Already uses `loadAppData()` ✅
- Any other components that load data directly

### Step 4: Remove Mock Data Generation

**Delete or ignore**:
- `scripts/generateSyntheticData.ts` (this is for stress testing, not production)
- Any hardcoded mock data arrays
- Any `generateMockData()` functions

**Search for and remove**:
```bash
# Find all mock data usage
grep -r "generateSyntheticData\|mock\|synthetic\|fake\|dummy" src/ --ignore-case
```

### Step 5: Update Environment Configuration

**Create/Update `.env.local`**:
```env
# Use static mode (default - uses JSON files)
NEXT_PUBLIC_DATA_MODE=static

# OR use Supabase mode (optional)
# NEXT_PUBLIC_DATA_MODE=supabase
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

### Step 6: Update Package Scripts

**Add to `package.json`**:
```json
{
  "scripts": {
    "ingest-data": "npx ts-node --esm scripts/ingest_humanitarian_data.ts"
  }
}
```

### Step 7: Update Documentation

**Update `REQUIREMENTS.md`**:
- Document the ingestion script
- Explain data sources
- Add instructions for regenerating data

### Step 8: Test Data Loading

1. **Verify JSON files exist**:
   ```bash
   ls -la public/data/*.json
   ```

2. **Test static mode**:
   ```bash
   npm run dev
   # Check browser console for data loading
   ```

3. **Verify data in UI**:
   - Check map shows real countries/regions
   - Check region names are real (not "Country 1", "Region 1")
   - Check organization names are real
   - Check meta.json stats match UI

### Step 9: Update UI Text (Remove "Synthetic" References)

**Files to update**:
- `src/components/layout/DisclaimerBanner.tsx`
  - Change "synthetic data" → "real humanitarian data"
  - Update source attribution

- `src/components/layout/ExplainDrawer.tsx`
  - Remove or update "Synthetic Data Policy" section
  - Update to explain real data sources

### Step 10: Verify Data Integrity

**Check**:
- All `isSynthetic` fields are `false` in `aid_edges.json`
- All `source` fields are `'hdx_hapi'` in `aid_edges.json`
- Region names are real administrative divisions
- Organization names are real (UNICEF, Red Cross, etc.)
- Need levels are calculated from real needs data

---

## 🔍 Key Differences: Mock vs Real Data

| Aspect | Mock Data (Main) | Real Data (amaan2) |
|--------|------------------|-------------------|
| **Source** | Generated by script | HDX HAPI (HDX) |
| **Countries** | Generic names ("Country 1") | Real names (Somalia, Yemen) |
| **Regions** | Generic names ("Region 1") | Real admin divisions (Banadir, Sana'a) |
| **Organizations** | Generic names ("Org 1") | Real orgs (UNICEF, ICRC, etc.) |
| **Population** | Random numbers | Real population data |
| **Need Levels** | Random assignment | Calculated from needs ratio |
| **Aid Edges** | Random linkages | Real operational presence data |
| **isSynthetic** | `true` | `false` |
| **source** | `undefined` or `'synthetic'` | `'hdx_hapi'` |
| **Data Count** | Small (test dataset) | Large (21k+ edges, 879 orgs) |

---

## 🚨 Important Notes

1. **Data Freshness**: The ingestion script should be run periodically to get updated data from HDX. Consider adding a cron job or scheduled task.

2. **Centroid Approximation**: Region centroids are currently approximated (not real GeoJSON boundaries). For production, consider using real GeoJSON files from HDX.

3. **Need Level Calculation**: Currently uses a simple ratio (population_in_need / population). You may want to refine this logic.

4. **Aid Type Mapping**: Sector names are mapped to aid types (food/medical/infrastructure). The mapping logic is in the ingestion script and may need refinement.

5. **Country Overrides**: Some countries use custom data sources. Check the `CONFIG` object in the ingestion script for override URLs.

6. **Supabase Optional**: The Supabase mode is optional. Static mode (JSON files) works perfectly fine and is simpler to deploy.

7. **Data Validation**: Always validate data after ingestion. The `validateAppData()` function will catch most issues.

8. **Error Handling**: The ingestion script has error handling, but network issues or HDX API changes could cause failures. Monitor the script output.

---

## 📚 Additional Resources

- **HDX HAPI Documentation**: https://data.humdata.org/about/hapi
- **HDX Dataset Browser**: https://data.humdata.org/
- **HAPI Global Datasets**: Search for "HAPI" on HDX

---

## ✅ Final Verification

After migration, verify:

- [ ] All JSON files generated in `public/data/`
- [ ] `meta.json` shows real stats (not zeros)
- [ ] Map displays real country/region names
- [ ] Organization names are real (not "Org 1", "Org 2")
- [ ] All `isSynthetic` fields are `false`
- [ ] All `source` fields are `'hdx_hapi'`
- [ ] No console errors about missing data
- [ ] UI text updated (no "synthetic data" references)
- [ ] Data loading works in both dev and production builds
- [ ] Ingestion script runs successfully
- [ ] Data validation passes

---

**End of Guide**
