/**
 * Graph construction utilities for Shafaf
 * Builds a bipartite graph from organizations and regions connected by aid edges
 */

import type {
  AppData,
  Graph,
  GraphNode,
  GraphEdge,
  Country,
  Region,
  Organization,
} from '../data/schema';
import { AID_TYPE_WEIGHTS } from './constants';

/**
 * Builds the complete graph from application data
 */
export function buildGraph(data: AppData): Graph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const adjacencyList = new Map<string, Set<string>>();

  // Add country nodes
  for (const country of data.countries) {
    nodes.set(country.id, {
      id: country.id,
      type: 'country',
      data: country,
    });
    adjacencyList.set(country.id, new Set());
  }

  // Add region nodes
  for (const region of data.regions) {
    nodes.set(region.id, {
      id: region.id,
      type: 'region',
      data: region,
    });
    adjacencyList.set(region.id, new Set());
    
    // Connect region to country
    const countryAdj = adjacencyList.get(region.countryId);
    if (countryAdj) {
      countryAdj.add(region.id);
    }
    adjacencyList.get(region.id)?.add(region.countryId);
  }

  // Add organization nodes
  for (const org of data.organizations) {
    nodes.set(org.id, {
      id: org.id,
      type: 'organization',
      data: org,
    });
    adjacencyList.set(org.id, new Set());
  }

  // Add edges from aid activities
  for (const edge of data.aidEdges) {
    const weight = AID_TYPE_WEIGHTS[edge.aidType] * edge.projectCount;
    
    edges.push({
      source: edge.orgId,
      target: edge.regionId,
      weight,
      aidType: edge.aidType,
    });

    // Update adjacency list (bidirectional for graph algorithms)
    adjacencyList.get(edge.orgId)?.add(edge.regionId);
    adjacencyList.get(edge.regionId)?.add(edge.orgId);
  }

  return { nodes, edges, adjacencyList };
}

/**
 * Gets all regions for a specific country
 */
export function getRegionsForCountry(countryId: string, data: AppData): Region[] {
  return data.regions.filter(r => r.countryId === countryId);
}

/**
 * Gets all organizations operating in a region
 */
export function getOrgsForRegion(regionId: string, data: AppData): Organization[] {
  const orgIds = new Set(
    data.aidEdges
      .filter(e => e.regionId === regionId)
      .map(e => e.orgId)
  );
  return data.organizations.filter(o => orgIds.has(o.id));
}

/**
 * Gets all regions where an organization operates
 */
export function getRegionsForOrg(orgId: string, data: AppData): Region[] {
  const regionIds = new Set(
    data.aidEdges
      .filter(e => e.orgId === orgId)
      .map(e => e.regionId)
  );
  return data.regions.filter(r => regionIds.has(r.id));
}

/**
 * Gets all aid edges for a specific region
 */
export function getEdgesForRegion(regionId: string, data: AppData) {
  return data.aidEdges.filter(e => e.regionId === regionId);
}

/**
 * Gets all aid edges for a specific country (all regions in that country)
 */
export function getEdgesForCountry(countryId: string, data: AppData) {
  const regionIds = new Set(
    data.regions
      .filter(r => r.countryId === countryId)
      .map(r => r.id)
  );
  return data.aidEdges.filter(e => regionIds.has(e.regionId));
}

/**
 * Builds a bipartite projection (Region <-> Region through shared Orgs)
 */
export function buildRegionProjection(data: AppData): Map<string, Map<string, number>> {
  const projection = new Map<string, Map<string, number>>();
  
  // Group regions by org
  const orgToRegions = new Map<string, Set<string>>();
  for (const edge of data.aidEdges) {
    if (!orgToRegions.has(edge.orgId)) {
      orgToRegions.set(edge.orgId, new Set());
    }
    orgToRegions.get(edge.orgId)!.add(edge.regionId);
  }

  // For each org, create edges between all pairs of regions it operates in
  for (const [orgId, regions] of orgToRegions) {
    const regionArray = Array.from(regions);
    for (let i = 0; i < regionArray.length; i++) {
      for (let j = i + 1; j < regionArray.length; j++) {
        const r1 = regionArray[i];
        const r2 = regionArray[j];

        if (!projection.has(r1)) {
          projection.set(r1, new Map());
        }
        if (!projection.has(r2)) {
          projection.set(r2, new Map());
        }

        // Increment shared org count
        const current1 = projection.get(r1)!.get(r2) || 0;
        projection.get(r1)!.set(r2, current1 + 1);
        
        const current2 = projection.get(r2)!.get(r1) || 0;
        projection.get(r2)!.set(r1, current2 + 1);
      }
    }
  }

  return projection;
}

/**
 * Builds an organization projection (Org <-> Org through shared Regions)
 */
export function buildOrgProjection(data: AppData): Map<string, Map<string, number>> {
  const projection = new Map<string, Map<string, number>>();
  
  // Group orgs by region
  const regionToOrgs = new Map<string, Set<string>>();
  for (const edge of data.aidEdges) {
    if (!regionToOrgs.has(edge.regionId)) {
      regionToOrgs.set(edge.regionId, new Set());
    }
    regionToOrgs.get(edge.regionId)!.add(edge.orgId);
  }

  // For each region, create edges between all pairs of orgs operating there
  for (const [regionId, orgs] of regionToOrgs) {
    const orgArray = Array.from(orgs);
    for (let i = 0; i < orgArray.length; i++) {
      for (let j = i + 1; j < orgArray.length; j++) {
        const o1 = orgArray[i];
        const o2 = orgArray[j];

        if (!projection.has(o1)) {
          projection.set(o1, new Map());
        }
        if (!projection.has(o2)) {
          projection.set(o2, new Map());
        }

        const current1 = projection.get(o1)!.get(o2) || 0;
        projection.get(o1)!.set(o2, current1 + 1);
        
        const current2 = projection.get(o2)!.get(o1) || 0;
        projection.get(o2)!.set(o1, current2 + 1);
      }
    }
  }

  return projection;
}
