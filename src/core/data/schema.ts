/**
 * AidGap Core Schema
 * Type definitions for all data structures used by the core engine.
 */

// ============================================================================
// Raw JSON Shapes (as stored in src/data/*.json)
// ============================================================================

export interface RawCountry {
    id: string;
    name: string;
    population: number;
    need_factor?: number;
    need_level?: 'low' | 'medium' | 'high';
}

export interface RawRegion {
    id: string;
    country_id: string;
    name: string;
    population: number;
    need_factor?: number;
    need_level?: 'low' | 'medium' | 'high';
}

export interface RawOrg {
    id: string;
    name: string;
}

export interface RawAidEdge {
    org_id: string;
    region_id: string;
    aid_type: string;
    project_count: number;
}

// ============================================================================
// Normalized Internal Structures
// ============================================================================

export interface Country {
    id: string;
    name: string;
    population: number;
    needFactor: number;
}

export interface Region {
    id: string;
    countryId: string;
    name: string;
    population: number;
    needFactor: number;
}

export interface Org {
    id: string;
    name: string;
}

export type AidType = 'food' | 'medical' | 'infrastructure';

export interface NormalizedEdge {
    orgId: string;
    regionId: string;
    aidType: AidType;
    projectCount: number;
    weightedContribution: number; // project_count * aid_type_weight
}

// ============================================================================
// Graph Structures
// ============================================================================

export interface AidGapGraph {
    regionToCountry: Map<string, string>;  // region_id -> country_id
    orgEdges: Map<string, NormalizedEdge[]>;  // org_id -> edges
    regionEdges: Map<string, NormalizedEdge[]>;  // region_id -> edges
    countryRegions: Map<string, string[]>;  // country_id -> region_ids
}

// ============================================================================
// Main Data Container
// ============================================================================

export interface AidGapData {
    countriesById: Map<string, Country>;
    regionsById: Map<string, Region>;
    orgsById: Map<string, Org>;
    edges: NormalizedEdge[];
    graph: AidGapGraph;
}

// ============================================================================
// Output Types (API Contracts)
// ============================================================================

export interface CountryScore {
    countryId: string;
    countryName: string;
    population: number;
    needFactor: number;
    aidPresenceRaw: number;
    coverageIndexRaw: number;
    coverageIndexNorm: number;  // 0..1, for heatmap
    orgCount: number;  // distinct orgs active in country
}

export interface RegionScore {
    regionId: string;
    regionName: string;
    population: number;
    needFactor: number;
    aidPresenceRaw: number;
    coverageIndexRaw: number;
    coverageIndexNorm: number;  // 0..1, for heatmap
    overlapOrgCount: number;  // degree centrality (number of orgs in region)
}

export interface OrgStat {
    orgId: string;
    orgName: string;
    weightedPresence: number;  // total weighted contribution in country
    projectCountTotal: number;
}

export interface AidTypeStat {
    aidType: AidType;
    weightedPresence: number;
    projectCountTotal: number;
}

// ============================================================================
// Additional Graph Operation Types (PRD: Variance + Bipartite)
// ============================================================================

export type SpreadLevel = 'low' | 'medium' | 'high';

export interface CoverageVariance {
    variance: number;           // statistical variance of regional coverage
    standardDeviation: number;  // easier to interpret
    coefficientOfVariation: number; // normalized (0-1 scale roughly)
    spread: SpreadLevel;        // categorical for UI display
}

export interface OrgRegionEdge {
    regionId: string;
    regionName: string;
    countryId: string;
    aidType: AidType;
    projectCount: number;
    weightedContribution: number;
}

export interface RegionOrgEdge {
    orgId: string;
    orgName: string;
    aidType: AidType;
    projectCount: number;
    weightedContribution: number;
}

