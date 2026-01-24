/**
 * AidGap Metrics Engine
 * Computes Coverage Index and related metrics.
 */

import type { AidGapData, CountryScore, RegionScore, CoverageVariance, SpreadLevel } from '../data/schema';
import { normalizeMinMax } from './constants';
import { getCountryEdges, getCountryOrgIds, getRegionOrgCount } from './buildGraph';

/**
 * Compute aid presence (sum of weighted contributions) for a set of edges
 */
function computeAidPresence(edges: { weightedContribution: number }[]): number {
    return edges.reduce((sum, e) => sum + e.weightedContribution, 0);
}

/**
 * Compute Coverage Index
 * Formula: aidPresence / (population * needFactor)
 */
function computeCoverageIndex(aidPresence: number, population: number, needFactor: number): number {
    if (population <= 0 || needFactor <= 0) {
        return 0;
    }
    return aidPresence / (population * needFactor);
}

/**
 * Compute scores for all countries (World View)
 * Used for world heatmap visualization.
 * 
 * @returns Array sorted by coverageIndexRaw descending
 */
export function computeCountryScores(data: AidGapData): CountryScore[] {
    const scores: CountryScore[] = [];

    for (const [countryId, country] of data.countriesById) {
        const edges = getCountryEdges(data.graph, countryId);
        const aidPresenceRaw = computeAidPresence(edges);
        const coverageIndexRaw = computeCoverageIndex(aidPresenceRaw, country.population, country.needFactor);
        const orgIds = getCountryOrgIds(data.graph, countryId);

        scores.push({
            countryId,
            countryName: country.name,
            population: country.population,
            needFactor: country.needFactor,
            aidPresenceRaw,
            coverageIndexRaw,
            coverageIndexNorm: 0, // will be set after normalization
            orgCount: orgIds.size,
        });
    }

    // Normalize coverage indices to [0, 1]
    const rawValues = scores.map(s => s.coverageIndexRaw);
    const normalizedValues = normalizeMinMax(rawValues);

    for (let i = 0; i < scores.length; i++) {
        scores[i].coverageIndexNorm = normalizedValues[i];
    }

    // Sort by coverageIndexRaw descending
    scores.sort((a, b) => b.coverageIndexRaw - a.coverageIndexRaw);

    return scores;
}

/**
 * Compute scores for all regions within a country (Country View)
 * Used for country-level heatmap visualization.
 * 
 * @param data - The loaded AidGap data
 * @param countryId - The country to get region scores for
 * @returns Array sorted by coverageIndexRaw descending
 */
export function computeRegionScores(data: AidGapData, countryId: string): RegionScore[] {
    const regionIds = data.graph.countryRegions.get(countryId) || [];
    const scores: RegionScore[] = [];

    for (const regionId of regionIds) {
        const region = data.regionsById.get(regionId);
        if (!region) continue;

        const edges = data.graph.regionEdges.get(regionId) || [];
        const aidPresenceRaw = computeAidPresence(edges);
        const coverageIndexRaw = computeCoverageIndex(aidPresenceRaw, region.population, region.needFactor);
        const overlapOrgCount = getRegionOrgCount(data.graph, regionId);

        scores.push({
            regionId,
            regionName: region.name,
            population: region.population,
            needFactor: region.needFactor,
            aidPresenceRaw,
            coverageIndexRaw,
            coverageIndexNorm: 0, // will be set after normalization
            overlapOrgCount,
        });
    }

    // Normalize coverage indices within this country's regions
    const rawValues = scores.map(s => s.coverageIndexRaw);
    const normalizedValues = normalizeMinMax(rawValues);

    for (let i = 0; i < scores.length; i++) {
        scores[i].coverageIndexNorm = normalizedValues[i];
    }

    // Sort by coverageIndexRaw descending
    scores.sort((a, b) => b.coverageIndexRaw - a.coverageIndexRaw);

    return scores;
}

/**
 * Get raw aid presence for a country (PRD: expose separately)
 * 
 * @param data - The loaded AidGap data
 * @param countryId - The country to analyze
 * @returns Total weighted aid presence
 */
export function getCountryAidPresence(data: AidGapData, countryId: string): number {
    const edges = getCountryEdges(data.graph, countryId);
    return computeAidPresence(edges);
}

/**
 * Calculate coverage variance for a country (PRD: Graph Operation)
 * Measures how unevenly aid is distributed across regions.
 * 
 * High variance = aid concentrated in few regions (coordination opportunity)
 * Low variance = aid spread evenly (good coverage)
 * 
 * @param data - The loaded AidGap data
 * @param countryId - The country to analyze
 * @returns Variance statistics with categorical spread level
 */
export function getCoverageVariance(data: AidGapData, countryId: string): CoverageVariance {
    const regionScores = computeRegionScores(data, countryId);

    if (regionScores.length === 0) {
        return { variance: 0, standardDeviation: 0, coefficientOfVariation: 0, spread: 'low' };
    }

    const coverageValues = regionScores.map(r => r.coverageIndexRaw);

    // Calculate mean
    const mean = coverageValues.reduce((a, b) => a + b, 0) / coverageValues.length;

    // Calculate variance
    const squaredDiffs = coverageValues.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / coverageValues.length;

    // Standard deviation
    const standardDeviation = Math.sqrt(variance);

    // Coefficient of variation (normalized measure)
    // CV = std/mean, but handle edge case where mean is 0
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;

    // Categorize spread for UI
    let spread: SpreadLevel;
    if (coefficientOfVariation < 0.3) {
        spread = 'low';      // relatively even distribution
    } else if (coefficientOfVariation < 0.7) {
        spread = 'medium';   // moderate concentration
    } else {
        spread = 'high';     // high concentration / inequality
    }

    return {
        variance,
        standardDeviation,
        coefficientOfVariation,
        spread,
    };
}

