/**
 * AidGap Ranking Functions
 * Top-K orgs and aid type breakdowns.
 */

import type { AidGapData, OrgStat, AidTypeStat, AidType } from '../data/schema';
import { getCountryEdges } from './buildGraph';

/**
 * Get top K organizations by weighted presence in a country
 * 
 * @param data - The loaded AidGap data
 * @param countryId - The country to analyze
 * @param k - Number of top orgs to return
 * @returns Array sorted by weightedPresence desc, then orgName asc for ties
 */
export function getTopOrgs(data: AidGapData, countryId: string, k: number): OrgStat[] {
    const edges = getCountryEdges(data.graph, countryId);

    // Aggregate by org
    const orgStats = new Map<string, { weighted: number; projects: number }>();

    for (const edge of edges) {
        const current = orgStats.get(edge.orgId) || { weighted: 0, projects: 0 };
        current.weighted += edge.weightedContribution;
        current.projects += edge.projectCount;
        orgStats.set(edge.orgId, current);
    }

    // Convert to array
    const result: OrgStat[] = [];
    for (const [orgId, stats] of orgStats) {
        const org = data.orgsById.get(orgId);
        if (!org) continue;

        result.push({
            orgId,
            orgName: org.name,
            weightedPresence: stats.weighted,
            projectCountTotal: stats.projects,
        });
    }

    // Sort by weightedPresence desc, then orgName asc for ties
    result.sort((a, b) => {
        if (b.weightedPresence !== a.weightedPresence) {
            return b.weightedPresence - a.weightedPresence;
        }
        return a.orgName.localeCompare(b.orgName);
    });

    // Return top K
    return result.slice(0, k);
}

/**
 * Get aid type breakdown for a country
 * 
 * @param data - The loaded AidGap data
 * @param countryId - The country to analyze
 * @returns Array sorted by weightedPresence desc
 */
export function getAidTypeBreakdown(data: AidGapData, countryId: string): AidTypeStat[] {
    const edges = getCountryEdges(data.graph, countryId);

    // Aggregate by aid type
    const typeStats = new Map<AidType, { weighted: number; projects: number }>();

    for (const edge of edges) {
        const current = typeStats.get(edge.aidType) || { weighted: 0, projects: 0 };
        current.weighted += edge.weightedContribution;
        current.projects += edge.projectCount;
        typeStats.set(edge.aidType, current);
    }

    // Convert to array
    const result: AidTypeStat[] = [];
    for (const [aidType, stats] of typeStats) {
        result.push({
            aidType,
            weightedPresence: stats.weighted,
            projectCountTotal: stats.projects,
        });
    }

    // Sort by weightedPresence desc
    result.sort((a, b) => b.weightedPresence - a.weightedPresence);

    return result;
}
