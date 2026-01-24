/**
 * AidGap Graph Builder
 * Constructs graph representation from raw data.
 */

import type {
    AidGapGraph,
    NormalizedEdge,
    RawAidEdge,
    AidType,
    Region
} from '../data/schema';
import { getAidTypeWeight, isValidAidType } from './constants';

/**
 * Build the graph structure from edges and regions
 */
export function buildGraph(
    rawEdges: RawAidEdge[],
    regionsById: Map<string, Region>
): { edges: NormalizedEdge[]; graph: AidGapGraph } {

    const normalizedEdges: NormalizedEdge[] = [];
    const orgEdges = new Map<string, NormalizedEdge[]>();
    const regionEdges = new Map<string, NormalizedEdge[]>();
    const regionToCountry = new Map<string, string>();
    const countryRegions = new Map<string, string[]>();

    // Build region -> country mapping and country -> regions mapping
    for (const [regionId, region] of regionsById) {
        regionToCountry.set(regionId, region.countryId);

        const regions = countryRegions.get(region.countryId) || [];
        regions.push(regionId);
        countryRegions.set(region.countryId, regions);
    }

    // Normalize edges and build adjacency maps
    for (const raw of rawEdges) {
        if (!isValidAidType(raw.aid_type)) {
            // Skip invalid edges - sanity checks will catch this
            continue;
        }

        const aidType = raw.aid_type as AidType;
        const weight = getAidTypeWeight(aidType);

        const edge: NormalizedEdge = {
            orgId: raw.org_id,
            regionId: raw.region_id,
            aidType,
            projectCount: raw.project_count,
            weightedContribution: raw.project_count * weight,
        };

        normalizedEdges.push(edge);

        // Add to org adjacency
        const orgList = orgEdges.get(edge.orgId) || [];
        orgList.push(edge);
        orgEdges.set(edge.orgId, orgList);

        // Add to region adjacency
        const regionList = regionEdges.get(edge.regionId) || [];
        regionList.push(edge);
        regionEdges.set(edge.regionId, regionList);
    }

    const graph: AidGapGraph = {
        regionToCountry,
        orgEdges,
        regionEdges,
        countryRegions,
    };

    return { edges: normalizedEdges, graph };
}

/**
 * Get all edges for a specific country (aggregated from its regions)
 */
export function getCountryEdges(graph: AidGapGraph, countryId: string): NormalizedEdge[] {
    const regionIds = graph.countryRegions.get(countryId) || [];
    const edges: NormalizedEdge[] = [];

    for (const regionId of regionIds) {
        const regionEdgeList = graph.regionEdges.get(regionId) || [];
        edges.push(...regionEdgeList);
    }

    return edges;
}

/**
 * Get distinct org IDs active in a country
 */
export function getCountryOrgIds(graph: AidGapGraph, countryId: string): Set<string> {
    const edges = getCountryEdges(graph, countryId);
    return new Set(edges.map(e => e.orgId));
}

/**
 * Get distinct org IDs active in a region (degree centrality)
 */
export function getRegionOrgCount(graph: AidGapGraph, regionId: string): number {
    const edges = graph.regionEdges.get(regionId) || [];
    const orgIds = new Set(edges.map(e => e.orgId));
    return orgIds.size;
}
