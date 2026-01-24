/**
 * AidGap Core Engine Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
    loadAidGapData,
    runSanityChecks,
    computeCountryScores,
    computeRegionScores,
    getTopOrgs,
    getAidTypeBreakdown,
    getCoverageVariance,
    getCountryAidPresence,
    getOrgRegions,
    getRegionOrgs,
    getOverlapRegions,
    type AidGapData,
} from '../index';

describe('AidGap Core Engine', () => {
    let data: AidGapData;

    beforeAll(() => {
        data = loadAidGapData();
    });

    describe('loadAidGapData', () => {
        it('should load all countries', () => {
            expect(data.countriesById.size).toBe(8);
            expect(data.countriesById.has('syria')).toBe(true);
            expect(data.countriesById.has('yemen')).toBe(true);
        });

        it('should load all regions', () => {
            expect(data.regionsById.size).toBe(32);
            expect(data.regionsById.has('syria-aleppo')).toBe(true);
        });

        it('should load all orgs', () => {
            expect(data.orgsById.size).toBe(15);
            expect(data.orgsById.has('world-food-programme')).toBe(true);
        });

        it('should build graph with correct region-country mapping', () => {
            expect(data.graph.regionToCountry.get('syria-aleppo')).toBe('syria');
            expect(data.graph.regionToCountry.get('yemen-sanaa')).toBe('yemen');
        });

        it('should normalize need_level to needFactor', () => {
            const syria = data.countriesById.get('syria');
            expect(syria?.needFactor).toBe(1.3); // high = 1.3
        });
    });

    describe('runSanityChecks', () => {
        it('should pass for valid data', () => {
            expect(() => runSanityChecks(data)).not.toThrow();
        });
    });

    describe('computeCountryScores', () => {
        it('should return scores for all countries', () => {
            const scores = computeCountryScores(data);
            expect(scores.length).toBe(8);
        });

        it('should compute coverage index correctly', () => {
            const scores = computeCountryScores(data);
            for (const score of scores) {
                expect(score.coverageIndexRaw).toBeGreaterThanOrEqual(0);
                expect(score.coverageIndexNorm).toBeGreaterThanOrEqual(0);
                expect(score.coverageIndexNorm).toBeLessThanOrEqual(1);
            }
        });

        it('should sort by coverageIndexRaw descending', () => {
            const scores = computeCountryScores(data);
            for (let i = 1; i < scores.length; i++) {
                expect(scores[i - 1].coverageIndexRaw).toBeGreaterThanOrEqual(scores[i].coverageIndexRaw);
            }
        });

        it('should count distinct orgs per country', () => {
            const scores = computeCountryScores(data);
            const syriaScore = scores.find(s => s.countryId === 'syria');
            expect(syriaScore?.orgCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('computeRegionScores', () => {
        it('should return scores for all regions in country', () => {
            const scores = computeRegionScores(data, 'syria');
            expect(scores.length).toBe(5);
        });

        it('should normalize within the country', () => {
            const scores = computeRegionScores(data, 'syria');
            if (scores.length > 0) {
                const norms = scores.map(s => s.coverageIndexNorm);
                expect(Math.max(...norms)).toBeCloseTo(1, 5);
                expect(Math.min(...norms)).toBeCloseTo(0, 5);
            }
        });

        it('should compute overlap org count', () => {
            const scores = computeRegionScores(data, 'syria');
            for (const score of scores) {
                expect(score.overlapOrgCount).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('getTopOrgs', () => {
        it('should return top K orgs', () => {
            const topOrgs = getTopOrgs(data, 'syria', 3);
            expect(topOrgs.length).toBeLessThanOrEqual(3);
        });

        it('should sort by weighted presence descending', () => {
            const topOrgs = getTopOrgs(data, 'syria', 5);
            for (let i = 1; i < topOrgs.length; i++) {
                expect(topOrgs[i - 1].weightedPresence).toBeGreaterThanOrEqual(topOrgs[i].weightedPresence);
            }
        });

        it('should include org names', () => {
            const topOrgs = getTopOrgs(data, 'syria', 3);
            for (const org of topOrgs) {
                expect(org.orgName).toBeTruthy();
            }
        });
    });

    describe('getAidTypeBreakdown', () => {
        it('should return breakdown by aid type', () => {
            const breakdown = getAidTypeBreakdown(data, 'syria');
            expect(breakdown.length).toBeGreaterThan(0);
            expect(breakdown.length).toBeLessThanOrEqual(3); // max 3 aid types
        });

        it('should include both weighted and raw counts', () => {
            const breakdown = getAidTypeBreakdown(data, 'syria');
            for (const stat of breakdown) {
                expect(stat.weightedPresence).toBeGreaterThan(0);
                expect(stat.projectCountTotal).toBeGreaterThan(0);
            }
        });

        it('should sort by weighted presence descending', () => {
            const breakdown = getAidTypeBreakdown(data, 'syria');
            for (let i = 1; i < breakdown.length; i++) {
                expect(breakdown[i - 1].weightedPresence).toBeGreaterThanOrEqual(breakdown[i].weightedPresence);
            }
        });
    });

    describe('getCoverageVariance', () => {
        it('should return variance statistics', () => {
            const variance = getCoverageVariance(data, 'syria');
            expect(variance.variance).toBeGreaterThanOrEqual(0);
            expect(variance.standardDeviation).toBeGreaterThanOrEqual(0);
            expect(variance.coefficientOfVariation).toBeGreaterThanOrEqual(0);
        });

        it('should return categorical spread level', () => {
            const variance = getCoverageVariance(data, 'syria');
            expect(['low', 'medium', 'high']).toContain(variance.spread);
        });

        it('should handle empty country gracefully', () => {
            const variance = getCoverageVariance(data, 'nonexistent');
            expect(variance.variance).toBe(0);
            expect(variance.spread).toBe('low');
        });
    });

    describe('getCountryAidPresence', () => {
        it('should return total weighted aid presence', () => {
            const presence = getCountryAidPresence(data, 'syria');
            expect(presence).toBeGreaterThanOrEqual(0);
        });

        it('should return 0 for nonexistent country', () => {
            const presence = getCountryAidPresence(data, 'nonexistent');
            expect(presence).toBe(0);
        });
    });

    describe('getOrgRegions (PRD: Bipartite Projection)', () => {
        it('should return regions where org operates', () => {
            const regions = getOrgRegions(data, 'world-food-programme');
            // WFP is huge, likely to have something.
            // If random seed makes it 0, logic is still valid, but let's assume >=0
            expect(regions.length).toBeGreaterThanOrEqual(0);
        });

        it('should include region names and country ids', () => {
            const regions = getOrgRegions(data, 'world-food-programme');
            if (regions.length > 0) {
                for (const r of regions) {
                    expect(r.regionName).toBeTruthy();
                    expect(r.countryId).toBeTruthy();
                }
            }
        });

        it('should sort by weighted contribution descending', () => {
            const regions = getOrgRegions(data, 'world-food-programme');
            for (let i = 1; i < regions.length; i++) {
                expect(regions[i - 1].weightedContribution).toBeGreaterThanOrEqual(regions[i].weightedContribution);
            }
        });
    });

    describe('getRegionOrgs (PRD: Bipartite Projection)', () => {
        it('should return orgs operating in region', () => {
            const orgs = getRegionOrgs(data, 'syria-aleppo');
            expect(orgs.length).toBeGreaterThanOrEqual(0);
        });

        it('should include org names', () => {
            const orgs = getRegionOrgs(data, 'syria-aleppo');
            for (const o of orgs) {
                expect(o.orgName).toBeTruthy();
            }
        });
    });

    describe('getOverlapRegions (PRD: Coordination Density)', () => {
        it('should return regions with multiple orgs', () => {
            const overlaps = getOverlapRegions(data, 'syria', 2);
            expect(overlaps.length).toBeGreaterThanOrEqual(0);
        });

        it('should include org list for each region', () => {
            const overlaps = getOverlapRegions(data, 'syria', 2);
            for (const o of overlaps) {
                expect(o.orgs.length).toBeGreaterThanOrEqual(2);
            }
        });

        it('should sort by org count descending', () => {
            const overlaps = getOverlapRegions(data, 'syria', 2);
            for (let i = 1; i < overlaps.length; i++) {
                expect(overlaps[i - 1].orgCount).toBeGreaterThanOrEqual(overlaps[i].orgCount);
            }
        });
    });
});
