# Shafaf Aid (AidGap)

An exploratory analytics platform that uses **graph theory + geospatial visualization** to surface **relative aid coverage mismatches** across regions. Provides decision-support signals for humanitarian coordination analysts.

> ⚠️ **DEMO MODE**: This application currently uses **synthetic mock data**. The sections below document exactly what mock data is used and what real data sources could replace them.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Mock Data Documentation](#mock-data-documentation)
  - [Countries](#1-countries-countriesjson)
  - [Administrative Regions](#2-administrative-regions-regionsjson)
  - [Humanitarian Organizations](#3-humanitarian-organizations-orgsjson)
  - [Aid Activity Edges](#4-aid-activity-edges-aid_edgesjson)
- [Data Requirements for Real Data](#data-requirements-for-real-data)
- [Suggested Real Data Sources](#suggested-real-data-sources)
- [Tech Stack](#tech-stack)
- [Key Metrics](#key-metrics)

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## Mock Data Documentation

All mock data files are located in `/src/data/`. Below is a comprehensive listing of every data point used in the demo, with metadata to help locate real-world replacements.

---

### 1. Countries (`countries.json`)

**Purpose**: Top-level geographic entities representing countries with humanitarian crises.

**File Location**: `/src/data/countries.json`

**Schema**:
```typescript
interface Country {
  id: string;           // Unique identifier (snake_case)
  name: string;         // Display name
  iso2: string;         // ISO 3166-1 alpha-2 code
  curated: boolean;     // Featured in world view
  centroid: [lng, lat]; // Geographic center point
}
```

**Mock Data** (5 countries):

| ID | Name | ISO2 | Centroid (lng, lat) | Why Selected |
|----|------|------|---------------------|--------------|
| `somalia` | Somalia | SO | [45.0, 6.0] | Protracted humanitarian crisis, food insecurity |
| `bangladesh` | Bangladesh | BD | [90.0, 24.0] | Rohingya refugee crisis, climate vulnerability |
| `yemen` | Yemen | YE | [48.0, 15.5] | Largest humanitarian crisis globally |
| `south_sudan` | South Sudan | SS | [30.0, 7.0] | Conflict, displacement, famine risk |
| `afghanistan` | Afghanistan | AF | [66.0, 33.0] | 2021+ humanitarian emergency |

**Real Data Sources to Find**:
- OCHA Humanitarian Response Plans (HRPs)
- INFORM Index risk rankings
- Global Humanitarian Overview

---

### 2. Administrative Regions (`regions.json`)

**Purpose**: Sub-national administrative divisions (provinces, states, districts) with population and need indicators.

**File Location**: `/src/data/regions.json`

**Schema**:
```typescript
interface Region {
  id: string;           // Unique identifier
  countryId: string;    // Parent country reference
  name: string;         // Region display name
  centroid: [lng, lat]; // Geographic center
  population: number;   // Estimated population
  needLevel: 'low' | 'medium' | 'high';  // Humanitarian need classification
}
```

**Mock Data by Country**:

#### Somalia (12 regions)

| Region ID | Name | Population | Need Level | Notes |
|-----------|------|------------|------------|-------|
| `somalia_banadir` | Banadir (Mogadishu) | 2,500,000 | high | Capital region, IDP concentration |
| `somalia_bay` | Bay | 800,000 | high | Famine-risk area |
| `somalia_gedo` | Gedo | 550,000 | high | Border region, Al-Shabaab presence |
| `somalia_hiraan` | Hiraan | 520,000 | medium | Flood-prone |
| `somalia_lower_juba` | Lower Juba | 490,000 | high | Al-Shabaab controlled areas |
| `somalia_middle_juba` | Middle Juba | 370,000 | medium | Access-constrained |
| `somalia_lower_shabelle` | Lower Shabelle | 1,200,000 | high | Agricultural crisis |
| `somalia_middle_shabelle` | Middle Shabelle | 520,000 | medium | Riverine flooding |
| `somalia_bakool` | Bakool | 310,000 | high | Severe drought impact |
| `somalia_mudug` | Mudug | 720,000 | medium | Puntland border |
| `somalia_galgaduud` | Galgaduud | 570,000 | medium | Central region |
| `somalia_nugaal` | Nugaal | 390,000 | low | Relatively stable |

#### Bangladesh (10 regions)

| Region ID | Name | Population | Need Level | Notes |
|-----------|------|------------|------------|-------|
| `bangladesh_dhaka` | Dhaka Division | 36,500,000 | medium | Urban poor, climate impact |
| `bangladesh_chittagong` | Chittagong Division | 28,400,000 | medium | Port region |
| `bangladesh_coxs_bazar` | Cox's Bazar District | 2,300,000 | high | **Rohingya refugee camps** |
| `bangladesh_sylhet` | Sylhet Division | 9,900,000 | medium | Flood-prone |
| `bangladesh_rajshahi` | Rajshahi Division | 18,500,000 | medium | Agricultural |
| `bangladesh_khulna` | Khulna Division | 15,700,000 | medium | Coastal vulnerability |
| `bangladesh_barishal` | Barishal Division | 8,200,000 | high | Cyclone exposure |
| `bangladesh_rangpur` | Rangpur Division | 15,800,000 | medium | Poverty hotspot |
| `bangladesh_mymensingh` | Mymensingh Division | 11,400,000 | low | Relatively stable |
| `bangladesh_teknaf` | Teknaf Upazila | 265,000 | high | **Rohingya border crossing point** |

#### Yemen (10 regions)

| Region ID | Name | Population | Need Level | Notes |
|-----------|------|------------|------------|-------|
| `yemen_sanaa` | Sana'a Governorate | 3,900,000 | high | Capital, Houthi-controlled |
| `yemen_aden` | Aden Governorate | 870,000 | high | Government-held, port |
| `yemen_taiz` | Taiz Governorate | 2,900,000 | high | Active frontline |
| `yemen_hodeidah` | Hodeidah Governorate | 2,200,000 | high | **Major port, famine risk** |
| `yemen_hajjah` | Hajjah Governorate | 1,900,000 | high | Northern conflict |
| `yemen_ibb` | Ibb Governorate | 2,600,000 | medium | Agricultural |
| `yemen_marib` | Marib Governorate | 320,000 | high | IDP reception area |
| `yemen_lahij` | Lahij Governorate | 990,000 | medium | Southern region |
| `yemen_abyan` | Abyan Governorate | 530,000 | high | AQAP presence history |
| `yemen_dhamar` | Dhamar Governorate | 1,700,000 | medium | Central highlands |

#### South Sudan (10 regions)

| Region ID | Name | Population | Need Level | Notes |
|-----------|------|------------|------------|-------|
| `south_sudan_juba` | Central Equatoria | 1,200,000 | high | Capital, ethnic tensions |
| `south_sudan_unity` | Unity State | 760,000 | high | Oil region, conflict |
| `south_sudan_upper_nile` | Upper Nile | 860,000 | high | Conflict-affected |
| `south_sudan_jonglei` | Jonglei | 1,400,000 | high | Largest state, flooding |
| `south_sudan_lakes` | Lakes | 690,000 | medium | Cattle-related violence |
| `south_sudan_warrap` | Warrap | 970,000 | high | Food insecurity |
| `south_sudan_nbg` | Northern Bahr el Ghazal | 820,000 | high | Refugee returns |
| `south_sudan_wbg` | Western Bahr el Ghazal | 350,000 | medium | Border region |
| `south_sudan_we` | Western Equatoria | 620,000 | medium | Agricultural |
| `south_sudan_ee` | Eastern Equatoria | 910,000 | medium | Cross-border dynamics |

#### Afghanistan (12 regions)

| Region ID | Name | Population | Need Level | Notes |
|-----------|------|------------|------------|-------|
| `afghanistan_kabul` | Kabul Province | 4,600,000 | high | Capital, IDP concentration |
| `afghanistan_herat` | Herat Province | 2,000,000 | medium | Western trade hub |
| `afghanistan_kandahar` | Kandahar Province | 1,300,000 | high | Southern conflict zone |
| `afghanistan_balkh` | Balkh Province | 1,400,000 | medium | Northern hub (Mazar-i-Sharif) |
| `afghanistan_nangarhar` | Nangarhar Province | 1,600,000 | high | Returnee influx from Pakistan |
| `afghanistan_helmand` | Helmand Province | 960,000 | high | Former conflict zone |
| `afghanistan_kunduz` | Kunduz Province | 1,050,000 | high | Conflict-affected north |
| `afghanistan_faryab` | Faryab Province | 1,030,000 | medium | Northwestern |
| `afghanistan_baghlan` | Baghlan Province | 950,000 | medium | Highway corridor |
| `afghanistan_badghis` | Badghis Province | 520,000 | high | Drought-affected |
| `afghanistan_ghor` | Ghor Province | 740,000 | high | Remote, access-constrained |
| `afghanistan_bamyan` | Bamyan Province | 490,000 | medium | Hazara majority |

**Real Data Sources to Find**:
- OCHA Administrative Boundary CODs (Common Operational Datasets)
- WorldPop population estimates
- IPC (Integrated Food Security Phase Classification) data
- ACLED conflict data for need assessments
- UNHCR population statistics

---

### 3. Humanitarian Organizations (`orgs.json`)

**Purpose**: Aid organizations (UN agencies, INGOs) that operate in the crisis regions.

**File Location**: `/src/data/orgs.json`

**Schema**:
```typescript
interface Organization {
  id: string;      // Unique identifier
  name: string;    // Organization full name
  type: string;    // 'UN' | 'International' | 'National'
}
```

**Mock Data** (20 organizations):

#### UN Agencies (7)

| ID | Name | Abbreviation | Mandate Focus |
|----|------|--------------|---------------|
| `org_wfp` | World Food Programme | WFP | Food assistance, logistics |
| `org_unhcr` | UNHCR | UNHCR | Refugees, shelter, protection |
| `org_unicef` | UNICEF | UNICEF | Children, health, education |
| `org_who` | World Health Organization | WHO | Health systems, disease response |
| `org_iom` | IOM | IOM | Migration, displacement tracking |
| `org_fao` | FAO | FAO | Agriculture, food security |
| `org_undp` | UNDP | UNDP | Development, recovery |

#### International NGOs (13)

| ID | Name | Abbreviation | Mandate Focus |
|----|------|--------------|---------------|
| `org_icrc` | ICRC | ICRC | Conflict, protection, medical |
| `org_msf` | Médecins Sans Frontières | MSF | Emergency medical care |
| `org_irc` | International Rescue Committee | IRC | Refugees, emergencies |
| `org_oxfam` | Oxfam International | Oxfam | WASH, livelihoods, advocacy |
| `org_care` | CARE International | CARE | Women, food, emergencies |
| `org_save` | Save the Children | SCI | Children, education, health |
| `org_mercy` | Mercy Corps | MC | Resilience, livelihoods |
| `org_nrc` | Norwegian Refugee Council | NRC | Displacement, legal aid |
| `org_acted` | ACTED | ACTED | Multi-sector, fragile states |
| `org_wvi` | World Vision International | WVI | Children, communities |
| `org_crs` | Catholic Relief Services | CRS | Multi-sector humanitarian |
| `org_drc` | Danish Refugee Council | DRC | Displacement, protection |
| `org_hi` | Humanity & Inclusion | HI | Disability inclusion, rehab |

**Real Data Sources to Find**:
- OCHA 3W (Who does What Where) datasets
- IATI (International Aid Transparency Initiative)
- Organization self-reported presence data
- ReliefWeb organization profiles

---

### 4. Aid Activity Edges (`aid_edges.json`)

**Purpose**: Connections between organizations and regions, representing aid presence/projects.

**File Location**: `/src/data/aid_edges.json`

**Schema**:
```typescript
interface AidEdge {
  id: string;           // Unique edge identifier
  orgId: string;        // Organization reference
  regionId: string;     // Region reference
  aidType: 'food' | 'medical' | 'infrastructure';
  projectCount: number; // Number of projects/activities
  isSynthetic: boolean; // True = mock data
  source: string;       // Data source identifier
}
```

**Summary Statistics** (209 total edges):

| Country | Regions | Edges | Orgs Present | Top Aid Types |
|---------|---------|-------|--------------|---------------|
| Somalia | 12 | 46 | 14 | Food (60%), Medical (25%), Infrastructure (15%) |
| Bangladesh | 10 | 28 | 13 | Food (40%), Medical (35%), Infrastructure (25%) |
| Yemen | 10 | 38 | 11 | Food (55%), Medical (35%), Infrastructure (10%) |
| South Sudan | 10 | 35 | 12 | Food (55%), Medical (30%), Infrastructure (15%) |
| Afghanistan | 12 | 36 | 14 | Food (45%), Medical (35%), Infrastructure (20%) |

**Aid Type Definitions**:

| Aid Type | Description | Weight (Coverage Calc) |
|----------|-------------|------------------------|
| `food` | Food assistance, nutrition, agricultural support | 1.0 |
| `medical` | Health services, disease response, maternal care | 1.2 (higher priority) |
| `infrastructure` | Shelter, WASH, roads, logistics | 0.8 |

**Sample Edges by Region** (showing project distribution):

| Region | Org | Aid Type | Project Count |
|--------|-----|----------|---------------|
| Cox's Bazar | UNHCR | infrastructure | 25 |
| Cox's Bazar | WFP | food | 22 |
| Cox's Bazar | MSF | medical | 15 |
| Hodeidah | WFP | food | 18 |
| Kabul | WFP | food | 15 |
| Jonglei | WFP | food | 14 |

**Real Data Sources to Find**:
- **OCHA 3W datasets** (Who, What, Where) - primary source
- **IATI activity data** - standardized XML feeds from organizations
- **ReliefWeb response maps**
- **Humanitarian Data Exchange (HDX)** datasets
- **FTS (Financial Tracking Service)** - funding flows to activities

---

## Data Requirements for Real Data

To replace mock data with real data, you need:

### Required Fields by Entity

**Countries**:
- ISO 3166-1 codes
- Geographic centroids

**Regions**:
- Admin level 1 or 2 boundaries (province/district)
- Population estimates
- Humanitarian need classification (IPC phase, severity)

**Organizations**:
- Unique IDs (could use IATI org IDs)
- Organization type classification
- Operational presence by country

**Aid Edges** (Most Important):
- Organization-to-region mappings
- Activity/project type classification
- Activity counts or funding amounts

---

## Suggested Real Data Sources

| Data Need | Primary Source | URL | Format |
|-----------|----------------|-----|--------|
| Humanitarian activities (3W) | OCHA HDX | https://data.humdata.org | CSV, JSON |
| Aid funding flows | OCHA FTS | https://fts.unocha.org | API |
| Organization activities | IATI Registry | https://iatiregistry.org | XML |
| Population data | WorldPop | https://www.worldpop.org | Raster, CSV |
| Food security phases | IPC | https://www.ipcinfo.org | Shapefiles |
| Conflict events | ACLED | https://acleddata.com | CSV |
| Admin boundaries | OCHA CODs | https://data.humdata.org | Shapefiles |
| Refugee statistics | UNHCR | https://data.unhcr.org | API, CSV |

### API-Accessible Sources

1. **HDX CKAN API**: `https://data.humdata.org/api/3/`
2. **OCHA ReliefWeb API**: `https://api.reliefweb.int/v1/`
3. **FTS API**: `https://api.hpc.tools/v2/`
4. **IATI Datastore**: `https://iatiregistry.org/api/`

---

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **MapLibre GL JS** + **deck.gl** for performant map visualization
- **Zustand** for state management
- **Supabase** support for production data (optional)

---

## Key Metrics

### Coverage Index

```
Coverage Index = (Σ Weighted Aid Presence) / (Population × Need Factor)
```

**Aid Type Weights**:
- Food: 1.0
- Medical: 1.2
- Infrastructure: 0.8

**Need Factors**:
- Low: 0.8
- Medium: 1.0
- High: 1.3

### Normalization

All coverage values are normalized **within the current view** (world or country) for relative comparison using min-max normalization with outlier clipping.

---

## License

MIT

---

## Credits

Built for humanitarian coordination research and demonstration purposes.

**Data Attribution**: Mock data is synthetic and does not represent actual humanitarian operations. Real data should be sourced from OCHA, IATI, and partner organizations with appropriate attribution.
