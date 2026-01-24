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
}

export interface Organization {
  id: string;
  name: string;
  type?: string;
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
}

export interface OrganizationPresence {
  orgId: string;
  orgName: string;
  aidTypes: AidType[];
  projectCount: number;
}

export interface OrgStat {
  orgId: string;
  orgName: string;
  totalProjects: number;
  weightedPresence: number;
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
