/**
 * AidGap Bipartite Graph Operations
 * Org ↔ Region relationship queries (PRD: Bipartite Projection)
 */

import type { AidGapData, OrgRegionEdge, RegionOrgEdge } from '../data/schema';

/**
 * Get all regions where an organization operates
 * Useful for: "Where does WFP work?"
 * 
 * @param data - The loaded AidGap data
 * @param orgId - The organization to query
 * @returns Array of region edges, sorted by weighted contribution desc
 */
export function getOrgRegions(data: AidGapData, orgId: string): OrgRegionEdge[] {
    const edges = data.graph.orgEdges.get(orgId) || [];

    const result: OrgRegionEdge[] = edges.map(edge => {
        const region = data.regionsById.get(edge.regionId);
        return {
            regionId: edge.regionId,
            regionName: region?.name || 'Unknown',
            countryId: region?.countryId || 'Unknown',
            aidType: edge.aidType,
            projectCount: edge.projectCount,
            weightedContribution: edge.weightedContribution,
        };
    });

    // Sort by weighted contribution descending
    result.sort((a, b) => b.weightedContribution - a.weightedContribution);

    return result;
}

/**
 * Get all organizations operating in a region
 * Useful for: "Who operates in Aleppo?"
 * 
 * @param data - The loaded AidGap data
 * @param regionId - The region to query
 * @returns Array of org edges, sorted by weighted contribution desc
 */
export function getRegionOrgs(data: AidGapData, regionId: string): RegionOrgEdge[] {
    const edges = data.graph.regionEdges.get(regionId) || [];

    const result: RegionOrgEdge[] = edges.map(edge => {
        const org = data.orgsById.get(edge.orgId);
        return {
            orgId: edge.orgId,
            orgName: org?.name || 'Unknown',
            aidType: edge.aidType,
            projectCount: edge.projectCount,
            weightedContribution: edge.weightedContribution,
        };
    });

    // Sort by weighted contribution descending
    result.sort((a, b) => b.weightedContribution - a.weightedContribution);

    return result;
}

/**
 * Find regions where multiple orgs operate together (coordination density)
 * Useful for: "Where is there most org overlap?"
 * 
 * @param data - The loaded AidGap data
 * @param countryId - The country to analyze
 * @param minOrgs - Minimum number of orgs to count as "overlap"
 * @returns Array of regions with overlap count, sorted desc
 */
export function getOverlapRegions(
    data: AidGapData,
    countryId: string,
    minOrgs: number = 2
): { regionId: string; regionName: string; orgCount: number; orgs: string[] }[] {
    const regionIds = data.graph.countryRegions.get(countryId) || [];
    const result: { regionId: string; regionName: string; orgCount: number; orgs: string[] }[] = [];

    for (const regionId of regionIds) {
        const edges = data.graph.regionEdges.get(regionId) || [];
        const orgIds = [...new Set(edges.map(e => e.orgId))];

        if (orgIds.length >= minOrgs) {
            const region = data.regionsById.get(regionId);
            const orgNames = orgIds
                .map(id => data.orgsById.get(id)?.name || id)
                .sort();

            result.push({
                regionId,
                regionName: region?.name || 'Unknown',
                orgCount: orgIds.length,
                orgs: orgNames,
            });
        }
    }

    // Sort by org count descending
    result.sort((a, b) => b.orgCount - a.orgCount);

    return result;
}
