/**
 * Core data types for AidGap
 * These types define the structure of all data flowing through the application
 */

// ============================================================================
// Base Entity Types
// ============================================================================

export interface Country {
  id: string;
  name: string;
  iso2: string;
  curated: boolean;
  centroid: [number, number]; // [lng, lat]
}

export interface Region {
  id: string;
  countryId: string;
  name: string;
  centroid: [number, number]; // [lng, lat]
  population: number;
  needLevel: NeedLevel;
  /** IPC Phase (e.g. "Phase 3"); synthetic if absent */
  ipcPhase?: string;
  /** Conflict event count; synthetic if absent */
  conflictEvents?: number;
  /** Volatility score 0-1 based on conflict data */
  volatility?: number;
  /** Dynamic need factor adjusted by volatility */
  dynamicNeedFactor?: number;
}

export interface Organization {
  id: string;
  name: string;
  type?: string;
  /** Official homepage or OCHA FTS profile; used for clickable org links */
  website_url?: string;
  /** Organization logo URL (placeholder or actual) */
  logo_url?: string;
  /** Country-specific intervention page deep links */
  country_deeplinks?: Record<string, string>;
}

export type AidType = 'food' | 'medical' | 'infrastructure';
export type NeedLevel = 'low' | 'medium' | 'high';

export interface AidEdge {
  id: string;
  orgId: string;
  regionId: string;
  aidType: AidType;
  projectCount: number;
  isSynthetic: boolean;
  source?: string;
}

// ============================================================================
// Computed/Derived Types
// ============================================================================

export interface WorldScore {
  countryId: string;
  countryName: string;
  normalizedCoverage: number; // 0-1, relative to current view
  rawCoverage: number;
  topOrgs: string[];
  regionCount: number;
  totalAidPresence: number;
}

export interface RegionScore {
  regionId: string;
  regionName: string;
  normalizedCoverage: number; // 0-1, relative to current view
  rawCoverage: number;
  variance: number;
  overlap: number; // degree centrality
  population: number;
  needLevel: NeedLevel;
}

export interface RegionDetail {
  regionId: string;
  regionName: string;
  countryId: string;
  countryName: string;
  population: number;
  needFactor: number;
  needLevel: NeedLevel;
  coverageIndex: number;
  normalizedCoverage: number;
  organizations: OrganizationPresence[];
  aidTypes: AidTypeBreakdown[];
  overlapIntensity: number;
  /** IPC Phase (e.g. "Phase 3"); for clickable source link */
  ipcPhase?: string;
  /** Conflict event count; for clickable source link */
  conflictEvents?: number;
}

export interface OrganizationPresence {
  orgId: string;
  orgName: string;
  aidTypes: AidType[];
  projectCount: number;
  /** Official homepage or OCHA FTS profile; used for clickable org links */
  website_url?: string;
}

export interface OrgStat {
  orgId: string;
  orgName: string;
  totalProjects: number;
  aidTypes: AidType[];
  regionsCovered: number;
}

export interface AidTypeBreakdown {
  aidType: AidType;
  count: number;
  percentage: number;
  weightedValue: number;
}

export interface OverlapStat {
  regionId: string;
  degreeCentrality: number;
  orgCount: number;
  sharedOrgs: string[]; // orgs that also operate in neighboring regions
}

// ============================================================================
// Graph Types
// ============================================================================

export interface GraphNode {
  id: string;
  type: 'country' | 'region' | 'organization';
  data: Country | Region | Organization;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  aidType: AidType;
}

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacencyList: Map<string, Set<string>>;
}

// ============================================================================
// Data Loading Types
// ============================================================================

export interface AppData {
  countries: Country[];
  regions: Region[];
  organizations: Organization[];
  aidEdges: AidEdge[];
}

export interface ViewportBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export type DataMode = 'static' | 'supabase';

// ============================================================================
// Map Types
// ============================================================================

export interface MapPoint {
  id: string;
  coordinates: [number, number];
  value: number;
  normalizedValue: number;
  type: 'country' | 'region';
  name: string;
  data: WorldScore | RegionScore;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ViewState {
  currentView: 'world' | 'country' | 'region';
  selectedCountryId: string | null;
  selectedRegionId: string | null;
  sidePanelOpen: boolean;
  explainDrawerOpen: boolean;
}
