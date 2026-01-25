/**
 * Core data types for AidGap
 * Countries, regions, organizations, aid edges, map state, scores, and mosque types
 */

// ============================================================================
// Raw Data
// ============================================================================

export type AidType = 'food' | 'medical' | 'infrastructure';
export type NeedLevel = 'low' | 'medium' | 'high';

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
  centroid: [number, number];
  population: number;
  needLevel: NeedLevel;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
}

export interface AidEdge {
  id: string;
  orgId: string;
  regionId: string;
  aidType: AidType;
  projectCount: number;
  isSynthetic: boolean;
  source?: string;
}

export interface AppData {
  countries: Country[];
  regions: Region[];
  organizations: Organization[];
  aidEdges: AidEdge[];
}

// ============================================================================
// Map & Viewport
// ============================================================================

export interface ViewportBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

// ============================================================================
// Scores & Detail
// ============================================================================

export interface WorldScore {
  countryId: string;
  countryName: string;
  normalizedCoverage: number;
  rawCoverage: number;
  topOrgs: string[];
  regionCount: number;
  totalAidPresence: number;
}

export interface RegionScore {
  regionId: string;
  regionName: string;
  normalizedCoverage: number;
  rawCoverage: number;
  variance: number;
  overlap: number;
  population: number;
  needLevel: NeedLevel;
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
  sharedOrgs: string[];
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
  organizations: { orgId: string; orgName: string; aidTypes: AidType[]; projectCount: number }[];
  aidTypes: AidTypeBreakdown[];
  overlapIntensity: number;
}

export interface OrgStat {
  orgId: string;
  orgName: string;
  totalProjects: number;
  aidTypes: AidType[];
  regionsCovered: number;
}

// ============================================================================
// Graph (buildGraph)
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
// Map Points (donor + mosque)
// ============================================================================

export interface HotspotScore {
  tier: 'country' | 'city' | 'mosque';
  mosqueName?: string;
  mosqueId?: string;
  mosqueNeedScore: number;
  normalizedNeed: number;
}

export type MapPointData = HotspotScore | Record<string, unknown>;

export interface MapPoint {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  value: number;
  normalizedValue: number;
  type: 'country' | 'region' | 'mosque';
  name?: string;
  data?: MapPointData;
}

// ============================================================================
// Mosque (mosques feature)
// ============================================================================

export type MosqueUrgency = 'low' | 'med' | 'high';

export interface Mosque {
  id: string;
  name: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  website?: string;
}

export interface MosqueWithFunding extends Mosque {
  goalAmount: number;
  raisedAmount: number;
  urgency: MosqueUrgency;
  emergencyAppeal?: string;
  necessityScore: number;
  normalizedNecessity: number;
}
