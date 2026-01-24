/**
 * Ranking utilities for AidGap
 * Provides top-k queries and sorting for organizations and regions
 */

import type {
    AppData,
    OrgStat,
    RegionScore,
    AidType,
} from '../data/schema';
import { DISPLAY, AID_TYPE_WEIGHTS } from './constants';
import { getRegionsForOrg, getEdgesForRegion } from './buildGraph';

/**
 * Gets top-k organizations for a specific region by project count
 */
export function getTopOrgsForRegion(
    regionId: string,
    data: AppData,
    k: number = DISPLAY.TOP_K_ORGS
): OrgStat[] {
    const edges = data.aidEdges.filter(e => e.regionId === regionId);

    // Aggregate by org with weighted presence
    const orgStats = new Map<string, {
        totalProjects: number;
        weightedPresence: number;
        aidTypes: Set<AidType>;
    }>();

    for (const edge of edges) {
        if (!orgStats.has(edge.orgId)) {
            orgStats.set(edge.orgId, { totalProjects: 0, weightedPresence: 0, aidTypes: new Set() });
        }
        const stat = orgStats.get(edge.orgId)!;
        stat.totalProjects += edge.projectCount;
        stat.weightedPresence += edge.projectCount * AID_TYPE_WEIGHTS[edge.aidType];
        stat.aidTypes.add(edge.aidType);
    }

    // Convert to array and add org info
    const results: OrgStat[] = [];
    for (const [orgId, stat] of orgStats) {
        const org = data.organizations.find(o => o.id === orgId);
        const regionsForOrg = getRegionsForOrg(orgId, data);

        results.push({
            orgId,
            orgName: org?.name || orgId,
            totalProjects: stat.totalProjects,
            weightedPresence: stat.weightedPresence,
            aidTypes: Array.from(stat.aidTypes),
            regionsCovered: regionsForOrg.length,
        });
    }

    // Sort by weighted presence desc, tie-break by name asc
    return results
        .sort((a, b) => b.totalProjects - a.totalProjects || a.orgName.localeCompare(b.orgName))
        .slice(0, k);
}

/**
 * Gets top-k organizations globally
 */
export function getTopOrgsGlobal(
    data: AppData,
    k: number = DISPLAY.TOP_K_ORGS
): OrgStat[] {
    // Aggregate across all edges with weighted presence
    const orgStats = new Map<string, {
        totalProjects: number;
        weightedPresence: number;
        aidTypes: Set<AidType>;
        regions: Set<string>;
    }>();

    for (const edge of data.aidEdges) {
        if (!orgStats.has(edge.orgId)) {
            orgStats.set(edge.orgId, {
                totalProjects: 0,
                weightedPresence: 0,
                aidTypes: new Set(),
                regions: new Set()
            });
        }
        const stat = orgStats.get(edge.orgId)!;
        stat.totalProjects += edge.projectCount;
        stat.weightedPresence += edge.projectCount * AID_TYPE_WEIGHTS[edge.aidType];
        stat.aidTypes.add(edge.aidType);
        stat.regions.add(edge.regionId);
    }

    const results: OrgStat[] = [];
    for (const [orgId, stat] of orgStats) {
        const org = data.organizations.find(o => o.id === orgId);

        results.push({
            orgId,
            orgName: org?.name || orgId,
            totalProjects: stat.totalProjects,
            weightedPresence: stat.weightedPresence,
            aidTypes: Array.from(stat.aidTypes),
            regionsCovered: stat.regions.size,
        });
    }

    // Sort by weighted presence desc, tie-break by name asc
    return results
        .sort((a, b) => b.totalProjects - a.totalProjects || a.orgName.localeCompare(b.orgName))
        .slice(0, k);
}

/**
 * Gets top-k organizations for a country
 */
export function getTopOrgsForCountry(
    countryId: string,
    data: AppData,
    k: number = DISPLAY.TOP_K_ORGS
): OrgStat[] {
    const countryRegionIds = new Set(
        data.regions
            .filter(r => r.countryId === countryId)
            .map(r => r.id)
    );

    const countryEdges = data.aidEdges.filter(e => countryRegionIds.has(e.regionId));

    // Aggregate by org with weighted presence
    const orgStats = new Map<string, {
        totalProjects: number;
        weightedPresence: number;
        aidTypes: Set<AidType>;
        regions: Set<string>;
    }>();

    for (const edge of countryEdges) {
        if (!orgStats.has(edge.orgId)) {
            orgStats.set(edge.orgId, {
                totalProjects: 0,
                weightedPresence: 0,
                aidTypes: new Set(),
                regions: new Set()
            });
        }
        const stat = orgStats.get(edge.orgId)!;
        stat.totalProjects += edge.projectCount;
        stat.weightedPresence += edge.projectCount * AID_TYPE_WEIGHTS[edge.aidType];
        stat.aidTypes.add(edge.aidType);
        stat.regions.add(edge.regionId);
    }

    const results: OrgStat[] = [];
    for (const [orgId, stat] of orgStats) {
        const org = data.organizations.find(o => o.id === orgId);

        results.push({
            orgId,
            orgName: org?.name || orgId,
            totalProjects: stat.totalProjects,
            weightedPresence: stat.weightedPresence,
            aidTypes: Array.from(stat.aidTypes),
            regionsCovered: stat.regions.size,
        });
    }

    // Sort by weighted presence desc, tie-break by name asc
    return results
        .sort((a, b) => b.totalProjects - a.totalProjects || a.orgName.localeCompare(b.orgName))
        .slice(0, k);
}

/**
 * Gets regions sorted by coverage gap (lowest coverage first)
 */
export function getRegionsByGap(
    regionScores: RegionScore[],
    k: number = DISPLAY.TOP_K_REGIONS
): RegionScore[] {
    return [...regionScores]
        .sort((a, b) => a.normalizedCoverage - b.normalizedCoverage)
        .slice(0, k);
}

/**
 * Gets regions sorted by coverage (highest coverage first)
 */
export function getRegionsByCoverage(
    regionScores: RegionScore[],
    k: number = DISPLAY.TOP_K_REGIONS
): RegionScore[] {
    return [...regionScores]
        .sort((a, b) => b.normalizedCoverage - a.normalizedCoverage)
        .slice(0, k);
}

/**
 * Gets regions with highest variance (potential outliers)
 */
export function getRegionsByVariance(
    regionScores: RegionScore[],
    k: number = DISPLAY.TOP_K_REGIONS
): RegionScore[] {
    return [...regionScores]
        .sort((a, b) => b.variance - a.variance)
        .slice(0, k);
}

/**
 * Gets regions with highest overlap (most orgs operating)
 */
export function getRegionsByOverlap(
    regionScores: RegionScore[],
    k: number = DISPLAY.TOP_K_REGIONS
): RegionScore[] {
    return [...regionScores]
        .sort((a, b) => b.overlap - a.overlap)
        .slice(0, k);
}
