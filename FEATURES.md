# Shafaf Aid – Complete Feature List & Implementation

This document lists every feature in the Shafaf Aid humanitarian command center and explains how each was implemented.

---

## 1. Navigation & Routing

### 1.1 World Page (`/`)
- **What it does:** Main entry point showing a global map with 5 curated countries. Users can switch between 3D globe and 2D map views.
- **How it was made:** Next.js App Router page at `src/app/page.tsx`. Loads app data via `loadAppData()`, computes `computeWorldScores()`, stores in Zustand. Renders `MapboxGlobe` (3D) or `MapView` (2D) based on `viewMode` state. Header, left sidebar (country list), legend, disclaimer, and Explain drawer are shown when `showUI` is true (after intro or in 2D mode).

### 1.2 Country Page (`/country/[countryId]`)
- **What it does:** Shows regional coverage for a selected country. Displays regions as polygons/points, left sidebar with region list, and a side panel when a region is selected.
- **How it was made:** Dynamic route at `src/app/country/[countryId]/page.tsx`. Uses `useParams()` for `countryId`. Loads data (or reuses cached `appData`), calls `computeCountryScores()`, then `selectCountryWithScores()` for a single batched store update. Renders `MapView` with `regionGeoJson` from `createSyntheticGeoJson()`. Region selection updates `selectedRegionId` and fetches `getRegionDetail()`.

### 1.3 Breadcrumb Navigation
- **What it does:** Header shows “World” and, when on a country, “/ Country Name” with correct active state.
- **How it was made:** `Header` reads `currentView` and `selectedCountryId` from the store, and `appData.countries` to resolve country names. `Link` components for “World” and the country segment; active segment uses `bg-white/10`.

### 1.4 Country/Region Click Navigation
- **What it does:** Clicking a country on the world map navigates to `/country/{id}`. Clicking a region on the country map selects it and opens the side panel.
- **How it was made:** World page passes `handleCountryClick` to `MapboxGlobe`/`MapView`; it calls `router.push(\`/country/${point.id}\`)` for country `MapPoint`s. Country page passes `handleRegionClick` and `handlePolygonClick`; they call `selectRegion(regionId)`, which sets `selectedRegionId` and `sidePanelOpen`.

---

## 2. Map & Geospatial Visualization

### 2.1 3D Globe View (Mapbox)
- **What it does:** Interactive 3D globe with country markers colored by coverage. Supports zoom, pan, auto-rotate pre-intro, and click-to-select.
- **How it was made:** `MapboxGlobe` in `src/components/map/MapboxGlobe.tsx` uses `react-map-gl` with Mapbox GL. Map style `mapbox://styles/mapbox/dark-v11` (or token default). GeoJSON `FeatureCollection` built from `mapPoints` (world scores + country centroids). Circle layers for glow and markers; `circle-color` uses `['get', 'normalizedValue']` with interpolate for red–yellow–green. `onClick` on layer triggers `onPointClick`. Auto-rotate via `map.rotateTo()` in a `requestAnimationFrame` loop when `!introComplete`.

### 2.2 2D Flat Map View (MapLibre + Deck.gl)
- **What it does:** 2D map with Deck.gl scatter layers (base, glow, pulse) and optional GeoJSON choropleth. Coverage-based coloring, hover tooltips, click handling.
- **How it was made:** `MapView` in `src/components/map/MapView.tsx` composes `DeckGL` over `Map` (react-map-gl/maplibre). Basemap from `getMapStyleUrl()` (env or Carto dark matter). Layers from `Layers.ts`: `createGlowLayer`, `createPulseLayer`, `createBasePointLayer`; for country view, `createRegionPolygonLayer` with `regionGeoJson`. `getInterpolatedCoverageColor(normalizedValue)` drives fill. View state stored locally and synced to store via `onViewStateChange`.

### 2.3 View Toggle (Globe ↔ Map)
- **What it does:** Toolbar control to switch between 3D globe and 2D map.
- **How it was made:** `ViewToggle` in `src/components/layout/ViewToggle.tsx`. Two buttons (“Globe”, “Map”) with `view` and `onChange` props. Parent (`page.tsx`) holds `viewMode` state and passes it down. Glassmorphism-style container via Tailwind and inline styles.

### 2.4 Choropleth Layer (Coverage by Color)
- **What it does:** Region polygons colored by normalized coverage (red = high gap, yellow = medium, green = low gap).
- **How it was made:** `createRegionPolygonLayer` in `Layers.ts` uses Deck.gl `GeoJsonLayer`. `getFillColor` uses `getInterpolatedCoverageColor` on `feature.properties.normalizedCoverage`. GeoJSON comes from `createSyntheticGeoJson` (circular polygons around centroids when real shapes are unavailable) or `mergeScoresIntoGeoJson` when real GeoJSON exists.

### 2.5 Proportional Circles Layer (Volume vs. Equity)
- **What it does:** Scatter circles whose size = total project count; color = coverage index. Shows volume (size) vs. equity (color).
- **How it was made:** `createProportionalCirclesLayer` in `Layers.ts` uses `ScatterplotLayer` over `EnhancedRegionPoint[]` from `useEnhancedRegionPoints`. `getRadius` uses `sqrt(normalizedProjects) * scale`; `getFillColor` uses coverage. `useEnhancedRegionPoints` aggregates `aidEdges` per region for `totalProjectCount` and `aidBreakdown`.

### 2.6 Dual-Layer Mode (Choropleth + Circles)
- **What it does:** Optional combined rendering: choropleth polygons plus proportional circles.
- **How it was made:** `createDualLayers` in `Layers.ts` builds an array: first `createRegionPolygonLayer`, then `createProportionalCirclesLayer`. Used when both `regionGeoJson` and enhanced region points are available.

### 2.7 Focus Transition / Fly-To Bounds
- **What it does:** When a country is selected, the map flies to fit that country’s region bounding box.
- **How it was made:** `useCountryBounds` in `selectors.ts` computes `ViewportBounds` from selected country’s region centroids plus padding. `MapUtils.fitBounds` returns `MapViewState` (center + zoom). `useFocusTransition` in `MapView` (or equivalent) applies `FlyToInterpolator` and `transitionDuration` to the Deck.gl view state so the map animates to the fitted view.

### 2.8 Glow & Pulse Layers
- **What it does:** Soft glow behind points; pulsing rings on high-gap (low-coverage) areas.
- **How it was made:** `createGlowLayer` and `createPulseLayer` in `Layers.ts`. Both use `ScatterplotLayer`. Glow: larger radius, lower opacity, `getFillColor` from coverage; hover increases radius. Pulse: only points with `normalizedValue < 0.4`, radius animates via `(time + id) % 1`, line color fades with phase.

### 2.9 Hover Tooltips with Sparkline
- **What it does:** Tooltip on hover over points/polygons shows name, coverage %, raw index, “Index Components” (weighted aid, population, need factor), and a mini bar chart of aid distribution (Food / Medical / Infrastructure).
- **How it was made:** `MapView` tracks `hoverInfo` (x, y, object) from Deck.gl `onHover`. `MapTooltip` renders a floating div. For `EnhancedRegionPoint`, it uses `aidBreakdown` and `totalProjectCount`; `SparklineBar` draws three SVG `rect`s (food=green, medical=red, infrastructure=blue) with heights proportional to share. NEED_FACTORS and weighted-aid math come from `@/core/graph/constants` and the same logic as metrics.

### 2.10 Delayed Hover Highlight
- **What it does:** Slight delay before hover state updates to avoid flicker when moving between points.
- **How it was made:** `handlePointHover` in `MapView` uses `setTimeout` (e.g. 50ms enter, 80ms leave) to update `delayedHoverId`. That id is passed to layers as `hoveredId` for highlight/glow. Tooltip shows immediately from `hoverInfo`.

### 2.11 Legend (High Gap → Low Gap)
- **What it does:** Small gradient bar and “High Gap” / “Low Gap” labels.
- **How it was made:** `Legend` in `src/components/layout/Legend.tsx`. Horizontal gradient using `COVERAGE_COLORS` (red → yellow → green). Glassmorphism-style container.

### 2.12 Map Utilities (Bounds, Fit, Zoom)
- **What it does:** Helpers for view state, bounds, and fitting.
- **How it was made:** `MapUtils.ts` implements `calculateBounds`, `calculateCenter`, `calculateZoomForBounds`, `fitBounds`, `createViewState`, `getWorldViewState`, `getCountryViewState`, `getRegionViewState`, `getMapStyleUrl`, `getOfflineFallbackStyle`, `interpolateViewState`, `easeInOutCubic`. Used by MapView, country page, and focus transition.

---

## 3. Data Loading & Sources

### 3.1 Static JSON Data
- **What it does:** Loads countries, regions, organizations, and aid edges from `src/data/*.json`.
- **How it was made:** `loadStaticData()` in `loadData.ts` uses dynamic `import()` of those JSON files, normalizes into `AppData`, runs `validateAppData` and `sanitizeForDemo`, and caches in `staticDataCache`.

### 3.2 Supabase Mode (Optional)
- **What it does:** When `NEXT_PUBLIC_DATA_MODE=supabase`, data is fetched from Supabase instead of JSON.
- **How it was made:** `supabaseClient.ts` reads env and exposes `getSupabaseClient()` and `getDataMode()`. `loadData.ts` branches on `getDataMode()`; Supabase path maps DB columns (e.g. `country_id`, `centroid_lng/lat`) to schema (`countryId`, `centroid`). Same `AppData` shape so the rest of the app is unchanged.

### 3.3 Viewport-Based API (`/api/nodes`)
- **What it does:** Returns countries, regions, organizations, and aid edges filtered by viewport bounds (and optional `countryId`). Used for viewport-based loading in Supabase or static mode.
- **How it was made:** Next.js route handler in `src/app/api/nodes/route.ts`. Reads `minLng`, `maxLng`, `minLat`, `maxLat`, `zoom`, `countryId` from query. In Supabase mode, queries `regions` by centroid bounds (and `country_id` if provided), then fetches related countries, `aid_edges`, and `orgs`. In static mode, uses `loadStaticData` and filters regions by bounds. Returns JSON.

### 3.4 Region Detail API (`/api/region/[regionId]`)
- **What it does:** Returns full region detail (metrics, organizations, aid breakdown) for a given region.
- **How it was made:** Route at `src/app/api/region/[regionId]/route.ts`. Supabase: fetch region, country, `aid_edges`, orgs; compute aid-type breakdown and org presence client-side. Static: `getRegionDetail(regionId, data)` plus `getTopOrgsForRegion`. Returns JSON or 404.

### 3.5 Data Manifest & Lazy Loading
- **What it does:** `manifest.json` describes generated assets (countries, regions, orgs, aid_edges) for orchestration or lazy loading.
- **How it was made:** `generateData.mjs` writes `manifest.json` with `version`, `generated`, `stats`, and `files`. Loader can use it to decide what to fetch first (e.g. geometry) and what to load when a country is selected.

---

## 4. Metrics & Coverage Logic

### 4.1 Coverage Index Formula
- **What it does:** Single metric for relative aid coverage:  
  **Coverage Index = (Σ Weighted Aid Presence) / (Population × Need Factor)**. Lower = higher gap.
- **How it was made:** Implemented in `metrics.ts` (`calculateRawCoverageIndex`, `calculateWeightedAidPresence`) and in `core/coverage/index.ts` (`calculateCoverageIndex`, `calculateWeightedAidPresence`). Weights: food 1.0, medical 1.2, infrastructure 0.8. Need factors: low 0.8, medium 1.0, high 1.3. Population in thousands. Result clamped to `[0, 10]`.

### 4.2 Standalone Coverage Module
- **What it does:** Testable, pure functions for coverage and simulation.
- **How it was made:** `src/core/coverage/index.ts` exports `calculateWeightedAidPresence`, `calculateCoverageIndex`, `simulateAidAddition`, `normalizeValues`, `getAidTypeBreakdown`, and types (`CoverageInput`, `CoverageResult`, `SimulationInput`, `SimulationResult`). No store or React; used by metrics, selectors, and SimulationSlider.

### 4.3 World-Level Scores
- **What it does:** Per-country coverage scores for the world view.
- **How it was made:** `computeWorldScores` in `metrics.ts` aggregates regions per country: weighted aid, population, need-weighted population; `rawCoverage = totalWeightedAid / (totalNeedWeighted/1000)`. Normalizes raw values across countries (`normalizeValues`), assigns `normalizedCoverage`. Also computes `topOrgs`, `regionCount`, `totalAidPresence`.

### 4.4 Country-Level (Region) Scores
- **What it does:** Per-region coverage scores within a country.
- **How it was made:** `computeCountryScores` in `metrics.ts` loops regions, gets `calculateRawCoverageIndex` per region, computes `overlap` (org count / total orgs). Normalizes raw scores within the country, then variance from mean. Produces `RegionScore[]` with `regionId`, `regionName`, `normalizedCoverage`, `rawCoverage`, `variance`, `overlap`, `population`, `needLevel`.

### 4.5 Region Detail
- **What it does:** Full detail for one region: coverage, orgs, aid-type breakdown, overlap intensity, IPC phase, conflict events.
- **How it was made:** `getRegionDetail` in `metrics.ts` loads region and country, gets `calculateRawCoverageIndex`, fetches `computeCountryScores` for normalization context, builds org presence from `getEdgesForRegion`, `getAidTypeBreakdownForRegion`, and `computeOverlapIntensity`. Derives `ipcPhase` and `conflictEvents` from region or synthetic defaults.

### 4.6 Normalization (Min–Max with Outliers)
- **What it does:** Normalizes raw coverage to 0–1 within current view, with percentile-based clamping for outliers.
- **How it was made:** `normalizeValues` in `metrics.ts` (and `coverage/index.ts`) sorts values, uses `OUTLIER_PERCENTILE` (e.g. 95) to cap max, then `(v - min) / range`, clamped to [0, 1]. Single value → 0.5.

### 4.7 Overlap Intensity (Degree Centrality)
- **What it does:** Measures org density in a region as share of all orgs.
- **How it was made:** `computeOverlapIntensity` in `metrics.ts` sets `degreeCentrality = orgs.length / totalOrgs`, and collects `sharedOrgs` (orgs that also operate in other regions of the same country).

### 4.8 Aid Type Breakdown
- **What it does:** Per-region counts and percentages for food, medical, infrastructure.
- **How it was made:** `getAidTypeBreakdownForRegion` aggregates `aidEdges` by `aidType`, computes `percentage` and `weightedValue` (count × `AID_TYPE_WEIGHTS`). Returned as `AidTypeBreakdown[]`.

### 4.9 Graph Representation
- **What it does:** Bipartite graph of orgs ↔ regions via aid edges for analysis.
- **How it was made:** `buildGraph` in `buildGraph.ts` creates `Graph`: `nodes` (countries, regions, orgs), `edges` (from `aidEdges` with weights), `adjacencyList`. Helpers: `getRegionsForCountry`, `getEdgesForRegion`, `getEdgesForCountry`, `getOrgsForRegion` used by metrics and API.

---

## 5. Simulation (“What-If”)

### 5.1 Simulation State
- **What it does:** Stores whether simulation is on, additional aid amount, aid type, and target region.
- **How it was made:** `SimulationState` and `simulation` in `viewStore`. Actions: `setSimulationEnabled`, `setSimulationAid`, `setSimulationAidType`, `resetSimulation`. `selectRegion` sets `simulation.targetRegionId`. `closeSidePanel` resets simulation.

### 5.2 Simulate Aid Slider
- **What it does:** Toggle + slider (0–50 extra projects) + aid-type selector. Recomputes coverage with simulated extra aid.
- **How it was made:** `SimulationSlider` in `src/components/ui/SimulationSlider.tsx`. Reads `simulation` and `regionDetail` from store, `useSimulatedCoverage` from selectors. `simulateAidAddition` in `coverage/index.ts` adds a virtual edge `{ aidType, projectCount: additionalAid }` and recalculates. UI: toggle, three type buttons, range input, “Reset Simulation.”

### 5.3 Dual Progress Bar (Current vs. Simulated)
- **What it does:** Two bars: “Current” coverage index vs. “Target” (simulated) index, plus % change.
- **How it was made:** Inside `SimulationSlider`, `currentIndex` and `simulatedIndex` from `useSimulatedCoverage`. Two horizontal bars (e.g. gradient vs. cyan), widths from `index * 10` (capped). `percentageChange` displayed with ↑/→.

---

## 6. Global Search (⌘K / Ctrl+K)

### 6.1 Search Modal
- **What it does:** Quick search over all regions and organizations. Opens with ⌘K / Ctrl+K, closes with Escape. Keyboard navigation (↑↓, Enter).
- **How it was made:** `GlobalSearch` in `src/components/layout/GlobalSearch.tsx`. `searchOpen` and `toggleSearch` from store. `useEffect` for `keydown`: meta/ctrl+K toggles, Escape closes. Backdrop + centered dialog; input focused when opened.

### 6.2 Searchable Items
- **What it does:** Regions (name, country subtitle) and organizations (name, type subtitle).
- **How it was made:** `useSearchItems` in `selectors.ts` builds a list from `appData.regions` and `appData.organizations`. Each item: `id`, `type` (‘region’ | ‘organization’), `name`, `subtitle`, optional `countryId`.

### 6.3 Filtering & Selection
- **What it does:** Live filter by query (name/subtitle); pick with Enter or click.
- **How it was made:** `filteredItems` = filter `searchItems` by `query` (lowercase includes), slice to 10. `selectedIndex` state; ArrowUp/ArrowDown adjust, Enter calls `handleSelect(filteredItems[selectedIndex])`. Clicking a row also calls `handleSelect`.

### 6.4 Navigation on Select
- **What it does:** Choosing a region goes to that country and selects the region. Choosing an org goes to a country where that org operates and selects a region.
- **How it was made:** `handleSelect`: for region, `router.push(\`/country/${countryId}\`)` then `setTimeout(() => selectRegion(item.id), 500)`. For org, find first `aidEdge` with that `orgId`, get its region’s `countryId`, then same navigation + `selectRegion`.

### 6.5 Search UI in Header
- **What it does:** Header button to open search, with ⌘K hint.
- **How it was made:** `Header` has a “Search” button calling `toggleSearch`; shows “⌘K” on larger screens. `GlobalSearch` is rendered in `layout.tsx` so it’s global.

---

## 7. UI Components

### 7.1 Header
- **What it does:** App title “Shafaf,” breadcrumb (World / Country), Search, Explain.
- **How it was made:** `Header` in `src/components/layout/Header.tsx`. Links for World and country; Search and Explain buttons. Uses `useViewStore` for `currentView`, `selectedCountryId`, `appData`, `toggleExplainDrawer`, `toggleSearch`. Fixed, glass-style bar.

### 7.2 Side Panel (Region Detail)
- **What it does:** Slide-in panel with region name, coverage index, metrics, aid breakdown, org list, simulation slider, synthetic-data notice.
- **How it was made:** `SidePanel` in `src/components/layout/SidePanel.tsx`. Renders when `sidePanelOpen`. Backdrop closes it via `closeSidePanel`. Uses `regionDetail` from store; `MetricCard`s for Population, Need Level, IPC Phase, Conflict Events, Organizations, Overlap; `BarBreakdown` for aid types; `TopList` for orgs; `SimulationSlider`; `CoverageIndicator`; synthetic notice. Styling: slate/glass, borders, typography.

### 7.3 Metric Cards (Clickable Data Sources)
- **What it does:** Compact cards for a metric (label, value, subvalue, icon). Optional `sourceUrl`: card becomes a link to data source (HDX, IPC, ACLED, FTS).
- **How it was made:** `MetricCard` in `src/components/ui/MetricCard.tsx`. When `sourceUrl` is set, wraps content in `<a href={sourceUrl} target="_blank" rel="noopener">`, adds link icon, hover styles. Icons from a small SVG map.

### 7.4 Top List (Ranked Items)
- **What it does:** Ranked list (e.g. orgs by project count) with optional “Show all” and optional external links per row.
- **How it was made:** `TopList` in `src/components/ui/TopList.tsx`. `ListItem` has `linkUrl`. When present, row is an `<a>` to `linkUrl`; external-link icon shown. Rank badges (e.g. top 3 amber). `showAll` state toggles full list vs. `maxItems` slice.

### 7.5 Bar Breakdown
- **What it does:** Horizontal bars for distribution (e.g. Food / Medical / Infrastructure) with label, value, and percentage.
- **How it was made:** `BarBreakdown` in `src/components/ui/BarBreakdown.tsx`. `BarItem`: label, value, percentage, color. Bar width = `(value / maxValue) * 100%`. Tailwind for layout.

### 7.6 Explain Drawer
- **What it does:** Side drawer with methodology: Coverage Index formula, normalization, overlap, aid weights, need factors.
- **How it was made:** `ExplainDrawer` in `src/components/layout/ExplainDrawer.tsx`. Toggled by `explainDrawerOpen` / `toggleExplainDrawer`. Content from `FORMULAS`, `AID_TYPE_WEIGHTS`, `NEED_FACTORS` in `constants.ts`. Backdrop + fixed right panel.

### 7.7 Disclaimer Banner
- **What it does:** Short line that coverage is relative; “More info” expands to extra bullets.
- **How it was made:** `DisclaimerBanner` in `src/components/layout/DisclaimerBanner.tsx`. `expanded` state; “More info” / “Less” toggles. Shown only in 2D mode on world page (`viewMode === '2d'`).

### 7.8 Loading State
- **What it does:** Full-screen loader with “Shafaf” title, spinner, and configurable message.
- **How it was made:** `LoadingState` in `src/components/layout/LoadingState.tsx`. Optional `message` prop. Centered layout, gradient/spinner styling. Used while `isLoading` on world or country page.

### 7.9 Hero Section (“Shafaf” Title)
- **What it does:** Large “Shafaf” title behind the globe; opacity controlled by scroll/zoom.
- **How it was made:** `HeroSection` in `src/components/layout/HeroSection.tsx`. Accepts `opacity` and `visible`. World page uses wheel listener to reduce `titleOpacity` and set `introComplete`; `HeroSection` can be driven by that. Currently page uses its own title fade logic; HeroSection is available for reuse.

### 7.10 Error State
- **What it does:** Full-screen error UI with message and “Retry” when data loading fails.
- **How it was made:** World page checks `error` from store; renders centered card with icon, message, and `window.location.reload()` on Retry. Country page has analogous handling.

---

## 8. State Management (Zustand)

### 8.1 View Store
- **What it does:** Central store for view, selection, map, data, simulation, and UI flags.
- **How it was made:** `viewStore` in `src/app_state/viewStore.ts` with `create` + `subscribeWithSelector`. State: `currentView`, `selectedCountryId`, `selectedRegionId`, `sidePanelOpen`, `explainDrawerOpen`, `searchOpen`, `isLoading`, `error`, `mapViewState`, `isTransitioning`, `appData`, `worldScores`, `countryScores`, `regionDetail`, `simulation`, `animationTime`. Actions include `selectCountry`, `selectCountryWithScores`, `selectRegion`, `setAppData`, `setRegionDetail`, simulation actions, `reset`.

### 8.2 Selectors
- **What it does:** Derived data and stable selectors to limit re-renders.
- **How it was made:** `selectors.ts` exposes `useMapData`, `useSidebarData`, `useCountryBounds`, `useSimulatedCoverage`, `useSearchItems`, `useEnhancedRegionPoints`, `useWorldMapPoints`, `useRegionMapPoints`, `useWorldSummary`, `useCountrySummary`, `useSelectedCountry`, `useCuratedCountries`. Uses `useMemo` and granular `useViewStore` subscriptions. `getCoverageColor`, `getInterpolatedCoverageColor` are pure helpers.

### 8.3 Batched Country Transition
- **What it does:** Switching country updates both `countryId` and `countryScores` in one go to avoid flicker.
- **How it was made:** `selectCountryWithScores(countryId, scores)` in the store sets `selectedCountryId`, `currentView: 'country'`, `countryScores`, and clears `selectedRegionId` / `regionDetail` / `simulation` in a single `set()`. Country page calls it after `computeCountryScores` instead of `selectCountry` + `setCountryScores` separately.

---

## 9. Theming & Styling

### 9.1 Command Center Aesthetic
- **What it does:** Dark, high-density UI: slate backgrounds, subtle borders, monospace for numbers, cyan accents.
- **How it was made:** Tailwind classes (`bg-slate-950`, `border-slate-700/40`, `font-mono`, `tabular-nums`, `text-cyan-400`), plus `tailwind.config` extensions (`cmd-bg`, `cmd-panel`, `font-inter`, `font-mono`). Panels use `backdrop-blur`, light borders.

### 9.2 Glassmorphism
- **What it does:** Frosted glass effect on overlays and panels.
- **How it was made:** `glass` utility in `globals.css` (`backdrop-filter: blur(16px)`, semi-transparent bg, border). Components use `glass` or similar Tailwind (`backdrop-blur`, `bg-*/80`). Legend, ViewToggle, Header, Side Panel use this.

### 9.3 Fonts
- **What it does:** Inter for UI/text, JetBrains Mono for numbers and code.
- **How it was made:** Google Fonts import in `globals.css`; `font-inter` and `font-mono` in Tailwind config. Applied via `font-inter` / `font-mono` and `layout` body class.

### 9.4 Coverage Colors
- **What it does:** Red–yellow–green scale for coverage (red = high gap, green = low gap).
- **How it was made:** `COVERAGE_COLORS` in `constants.ts`. `getInterpolatedCoverageColor` in selectors maps `normalizedCoverage` to RGB via linear interpolation between green↔yellow↔red. Used by layers, legend, and `CoverageIndicator`.

### 9.5 Slider Styling
- **What it does:** Custom range input look for simulation slider.
- **How it was made:** `slider-thumb` class in `globals.css`; WebKit/Moz thumb styles (cyan circle, glow). Simulation slider uses `slider-thumb` on the range input.

---

## 10. Data Generation

### 10.1 Synthetic Data Script
- **What it does:** Generates `countries.json`, `regions.json`, `orgs.json`, `aid_edges.json`, and `manifest.json` for 5 countries, 76 regions, 20 orgs.
- **How it was made:** `scripts/generateData.mjs` (Node ESM). Hard-coded country/region/org definitions; `Rng` (LCG) for reproducibility. `genEdges` assigns orgs and projects per region (need-based). Writes to `src/data/`. `npm run generate-data` runs it.

### 10.2 Five-Country Coverage
- **What it does:** Afghanistan (34 provinces), Somalia, Bangladesh, Yemen, South Sudan with full region lists.
- **How it was made:** Arrays `AF`, `SO`, `BD`, `YE`, `SS` in `generateData.mjs` with `id`, `name`, `centroid`, `population`, `needLevel`, `countryId`. Combined into `REGIONS`.

### 10.3 Volatility & Dynamic Need
- **What it does:** Per-region `volatility` (0–1), `dynamicNeedFactor`, `ipcPhase`, `conflictEvents` from need level and optional conflict proxy.
- **How it was made:** `calcVolatility`, `dynamicNeedFactor`, `calcIPCPhase`, `calcConflictEvents` in `generateData.mjs`. Applied in `enhanceRegions`; edges use `volatility` (e.g. more orgs, fewer projects in high volatility). Schema extended with `volatility`, `dynamicNeedFactor`; `Region` and `RegionDetail` include `ipcPhase`, `conflictEvents`.

### 10.4 Organization `website_url` & `logo_url`
- **What it does:** Each org has `website_url` (homepage) and `logo_url` (placeholder or real).
- **How it was made:** `ORGS` in `generateData.mjs` includes both. Schema `Organization` has `website_url`, `logo_url`. Loader and metrics pass them through; `TopList` uses `linkUrl` (from `website_url`) for org rows.

### 10.5 Country Deep-Links (Reference)
- **What it does:** Script maintains a mapping of org→country deep-links (e.g. WFP Afghanistan) for potential use.
- **How it was made:** `COUNTRY_DEEPLINKS` object in `generateData.mjs`; not yet written into generated JSON. Schema `Organization.country_deeplinks` is defined for when that’s used.

---

## 11. Type Safety & Schema

### 11.1 Core Schema
- **What it does:** TypeScript interfaces for all entities and derived types.
- **How it was made:** `src/core/data/schema.ts` defines `Country`, `Region`, `Organization`, `AidEdge`, `AidType`, `NeedLevel`, `WorldScore`, `RegionScore`, `RegionDetail`, `OrganizationPresence`, `AidTypeBreakdown`, `OverlapStat`, `AppData`, `ViewportBounds`, `MapViewState`, `MapPoint`, `Graph` types, etc. Used across app, API, and loaders.

### 11.2 Validation & Sanitization
- **What it does:** Validates loaded data and optionally sanitizes for demo.
- **How it was made:** `validateAppData` and `sanitizeForDemo` in `sanityChecks.ts`. `loadStaticData` / Supabase load runs validation; invalid data can trigger errors or fallbacks.

---

## 12. Intro & UX Flourishes

### 12.1 3D Intro (Title Fade on Scroll)
- **What it does:** On world 3D view, scrolling down fades the “Shafaf” title and reveals UI; once faded, intro is “complete.”
- **How it was made:** World page `useEffect` listens for `wheel` when `viewMode === '3d'` and `!introComplete`. Down-scroll decreases `titleOpacity`; at 0, `setIntroComplete(true)`. `showUI` = `introComplete` or 2D mode; header, sidebar, legend use `showUI` for visibility and pointer-events.

### 12.2 Auto-Rotate Globe
- **What it does:** Globe slowly rotates until user finishes intro (e.g. first scroll).
- **How it was made:** `MapboxGlobe` runs a `requestAnimationFrame` loop that calls `map.rotateTo` with incrementing bearing when `autoRotate && !introComplete`. Loop cleared when `introComplete` or unmount.

---

## 13. Accessibility & Polish

### 13.1 Focus States
- **What it does:** Visible focus rings for keyboard users.
- **How it was made:** `:focus-visible` styles in `globals.css` (e.g. cyan outline). Buttons and links use `focus:ring-2 focus:ring-cyan-500/50` where relevant.

### 13.2 Keyboard Shortcuts
- **What it does:** ⌘K / Ctrl+K for search, Escape to close search.
- **How it was made:** `GlobalSearch` `useEffect` adds `keydown` listener; `preventDefault` on shortcuts. Search dialog shows “⌘K”, “↑↓”, “↵”, “ESC” hints.

### 13.3 Scrollbar Styling
- **What it does:** Dark, subtle scrollbars for panels.
- **How it was made:** `::-webkit-scrollbar*` in `globals.css` (track, thumb, hover). Used in sidebars and scrollable lists.

---

## 14. Summary Table

| Category        | Features |
|----------------|----------|
| **Navigation** | World page, country page, breadcrumbs, click-to-navigate |
| **Maps**       | 3D globe, 2D map, view toggle, choropleth, proportional circles, dual-layer, focus/flyTo, glow, pulse, tooltips with sparkline, legend |
| **Data**       | Static JSON, Supabase, viewport API, region API, manifest |
| **Metrics**    | Coverage index, world/country scores, region detail, normalization, overlap, aid breakdown, graph |
| **Simulation** | Simulation state, slider, aid-type selector, dual progress bar |
| **Search**     | ⌘K modal, regions + orgs, filter, keyboard nav, navigate on select |
| **UI**         | Header, side panel, metric cards, top list, bar breakdown, explain drawer, disclaimer, loading, error, hero |
| **State**      | Zustand store, selectors, batched country transition |
| **Theming**    | Command center, glassmorphism, Inter + JetBrains Mono, coverage colors, slider |
| **Data Gen**   | Synthetic script, 5 countries, volatility, org URLs/logos, deep-link map |
| **Types**      | Schema, validation, sanitization |
| **UX**         | Intro fade, auto-rotate, focus, shortcuts, scrollbars |

---

*This list reflects the Shafaf Aid codebase as of the last audit. Implementation details live in the referenced source files.*
