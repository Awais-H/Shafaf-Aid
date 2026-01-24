/**
 * Core metrics calculation engine for AidGap
 * Implements Coverage Index, normalization, centrality, and variance calculations
 */

import type {
  AppData,
  WorldScore,
  RegionScore,
  RegionDetail,
  AidTypeBreakdown,
  OverlapStat,
  AidType,
  NeedLevel,
} from '../data/schema';
import {
  AID_TYPE_WEIGHTS,
  NEED_FACTORS,
  NORMALIZATION,
} from './constants';
import {
  getRegionsForCountry,
  getEdgesForRegion,
  getEdgesForCountry,
  getOrgsForRegion,
} from './buildGraph';
import { clamp, safeDiv, assertValidNumber } from './sanityChecks';

// ============================================================================
// Core Coverage Index Calculation
// ============================================================================

/**
 * Calculates weighted aid presence for a region
 */
function calculateWeightedAidPresence(regionId: string, data: AppData): number {
  const edges = getEdgesForRegion(regionId, data);
  let total = 0;

  for (const edge of edges) {
    const weight = AID_TYPE_WEIGHTS[edge.aidType];
    total += weight * edge.projectCount;
  }

  return total;
}

/**
 * Calculates the raw Coverage Index for a region
 * Formula: Coverage Index = (Σ Weighted Aid Presence) / (Population × Need Factor)
 */
function calculateRawCoverageIndex(
  regionId: string,
  data: AppData,
  regionMap: Map<string, { population: number; needLevel: NeedLevel }>
): number {
  const regionInfo = regionMap.get(regionId);
  if (!regionInfo) return 0;

  const weightedAidPresence = calculateWeightedAidPresence(regionId, data);
  const needFactor = NEED_FACTORS[regionInfo.needLevel];
  const population = Math.max(regionInfo.population, NORMALIZATION.MIN_POPULATION);

  // Normalize population to thousands for reasonable scale
  const populationK = population / 1000;

  const rawIndex = safeDiv(weightedAidPresence, populationK * needFactor);

  return clamp(rawIndex, NORMALIZATION.MIN_COVERAGE_INDEX, NORMALIZATION.MAX_COVERAGE_INDEX);
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalizes values within a view (0-1 range)
 * Uses min-max normalization with outlier handling
 */
function normalizeValues(values: number[]): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [0.5]; // Single value gets middle

  // Sort for percentile calculation
  const sorted = [...values].sort((a, b) => a - b);

  // Use percentile-based bounds to handle outliers
  const percentileIdx = Math.floor(sorted.length * (NORMALIZATION.OUTLIER_PERCENTILE / 100));
  const maxVal = sorted[Math.min(percentileIdx, sorted.length - 1)];
  const minVal = sorted[0];

  const range = maxVal - minVal;
  if (range === 0) return values.map(() => 0.5);

  return values.map(v => {
    const normalized = (v - minVal) / range;
    return clamp(normalized, 0, 1);
  });
}

// ============================================================================
// World-Level Scores
// ============================================================================

/**
 * Computes coverage scores for all countries (world view)
 */
export function computeWorldScores(data: AppData): WorldScore[] {
  const countryScores: WorldScore[] = [];

  // Build region lookup map
  const regionMap = new Map(
    data.regions.map(r => [r.id, { population: r.population, needLevel: r.needLevel }])
  );

  // Calculate raw scores per country
  const rawScores: number[] = [];

  for (const country of data.countries) {
    const regions = getRegionsForCountry(country.id, data);
    const edges = getEdgesForCountry(country.id, data);

    // Aggregate coverage across regions
    let totalWeightedAid = 0;
    let totalPopulation = 0;
    let totalNeedWeighted = 0;

    for (const region of regions) {
      const regionInfo = regionMap.get(region.id);
      if (!regionInfo) continue;

      const weightedAid = calculateWeightedAidPresence(region.id, data);
      const needFactor = NEED_FACTORS[regionInfo.needLevel];

      totalWeightedAid += weightedAid;
      totalPopulation += regionInfo.population;
      totalNeedWeighted += regionInfo.population * needFactor;
    }

    const rawCoverage = safeDiv(totalWeightedAid, totalNeedWeighted / 1000);
    rawScores.push(rawCoverage);

    // Get top organizations for this country
    const orgCounts = new Map<string, number>();
    for (const edge of edges) {
      const current = orgCounts.get(edge.orgId) || 0;
      orgCounts.set(edge.orgId, current + edge.projectCount);
    }

    const topOrgs = Array.from(orgCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([orgId]) => {
        const org = data.organizations.find(o => o.id === orgId);
        return org?.name || orgId;
      });

    countryScores.push({
      countryId: country.id,
      countryName: country.name,
      normalizedCoverage: 0, // Will be set after normalization
      rawCoverage,
      topOrgs,
      regionCount: regions.length,
      totalAidPresence: totalWeightedAid,
    });
  }

  // Normalize within world view
  const normalized = normalizeValues(rawScores);
  for (let i = 0; i < countryScores.length; i++) {
    countryScores[i].normalizedCoverage = assertValidNumber(normalized[i]);
  }

  return countryScores;
}

// ============================================================================
// Country-Level Scores (Region breakdown)
// ============================================================================

/**
 * Computes coverage scores for all regions within a country
 */
export function computeCountryScores(countryId: string, data: AppData): RegionScore[] {
  const regions = getRegionsForCountry(countryId, data);
  const regionScores: RegionScore[] = [];

  // Build region lookup map
  const regionMap = new Map(
    data.regions.map(r => [r.id, { population: r.population, needLevel: r.needLevel }])
  );

  // Calculate raw scores per region
  const rawScores: number[] = [];

  for (const region of regions) {
    const rawCoverage = calculateRawCoverageIndex(region.id, data, regionMap);
    rawScores.push(rawCoverage);

    // Calculate overlap (number of unique orgs)
    const orgs = getOrgsForRegion(region.id, data);
    const overlap = orgs.length / Math.max(data.organizations.length, 1);

    regionScores.push({
      regionId: region.id,
      regionName: region.name,
      normalizedCoverage: 0, // Will be set after normalization
      rawCoverage,
      variance: 0, // Will calculate after normalization
      overlap,
      population: region.population,
      needLevel: region.needLevel,
    });
  }

  // Normalize within country view
  const normalized = normalizeValues(rawScores);
  for (let i = 0; i < regionScores.length; i++) {
    regionScores[i].normalizedCoverage = assertValidNumber(normalized[i]);
  }

  // Calculate variance from mean
  if (regionScores.length > 0) {
    const mean = normalized.reduce((a, b) => a + b, 0) / normalized.length;
    for (let i = 0; i < regionScores.length; i++) {
      regionScores[i].variance = Math.abs(normalized[i] - mean);
    }
  }

  return regionScores;
}

// ============================================================================
// Region Detail
// ============================================================================

/**
 * Gets detailed information for a specific region
 */
export function getRegionDetail(regionId: string, data: AppData): RegionDetail | null {
  const region = data.regions.find(r => r.id === regionId);
  if (!region) return null;

  const country = data.countries.find(c => c.id === region.countryId);
  if (!country) return null;

  // Build region lookup map for coverage calculation
  const regionMap = new Map(
    data.regions.map(r => [r.id, { population: r.population, needLevel: r.needLevel }])
  );

  const rawCoverage = calculateRawCoverageIndex(regionId, data, regionMap);

  // Get country-level normalization for context
  const countryScores = computeCountryScores(region.countryId, data);
  const regionScore = countryScores.find(s => s.regionId === regionId);

  // Get organizations operating in this region
  const edges = getEdgesForRegion(regionId, data);
  const orgMap = new Map<string, { aidTypes: Set<AidType>; projectCount: number }>();

  for (const edge of edges) {
    if (!orgMap.has(edge.orgId)) {
      orgMap.set(edge.orgId, { aidTypes: new Set(), projectCount: 0 });
    }
    const orgInfo = orgMap.get(edge.orgId)!;
    orgInfo.aidTypes.add(edge.aidType);
    orgInfo.projectCount += edge.projectCount;
  }

  const organizations = Array.from(orgMap.entries()).map(([orgId, info]) => {
    const org = data.organizations.find(o => o.id === orgId);
    return {
      orgId,
      orgName: org?.name || orgId,
      aidTypes: Array.from(info.aidTypes),
      projectCount: info.projectCount,
    };
  }).sort((a, b) => b.projectCount - a.projectCount);

  // Calculate aid type breakdown
  const aidTypes = getAidTypeBreakdownForRegion(regionId, data);

  // Calculate overlap intensity
  const overlapStat = computeOverlapIntensity(regionId, data);

  return {
    regionId,
    regionName: region.name,
    countryId: country.id,
    countryName: country.name,
    population: region.population,
    needFactor: NEED_FACTORS[region.needLevel],
    needLevel: region.needLevel,
    coverageIndex: rawCoverage,
    normalizedCoverage: regionScore?.normalizedCoverage ?? 0.5,
    organizations,
    aidTypes,
    overlapIntensity: overlapStat.degreeCentrality,
  };
}

// ============================================================================
// Aid Type Breakdown
// ============================================================================

/**
 * Gets aid type distribution for a region
 */
export function getAidTypeBreakdownForRegion(regionId: string, data: AppData): AidTypeBreakdown[] {
  const edges = getEdgesForRegion(regionId, data);

  const typeCounts: Record<AidType, number> = {
    food: 0,
    medical: 0,
    infrastructure: 0,
  };

  let total = 0;
  for (const edge of edges) {
    typeCounts[edge.aidType] += edge.projectCount;
    total += edge.projectCount;
  }

  const breakdown: AidTypeBreakdown[] = [];
  for (const [aidType, count] of Object.entries(typeCounts) as [AidType, number][]) {
    breakdown.push({
      aidType,
      count,
      percentage: safeDiv(count * 100, total),
      weightedValue: count * AID_TYPE_WEIGHTS[aidType],
    });
  }

  return breakdown.sort((a, b) => b.count - a.count);
}

/**
 * Gets aid type distribution for an entire country
 */
export function getAidTypeBreakdownForCountry(countryId: string, data: AppData): AidTypeBreakdown[] {
  const countryEdges = getEdgesForCountry(countryId, data);

  const typeCounts: Record<AidType, number> = {
    food: 0,
    medical: 0,
    infrastructure: 0,
  };

  let total = 0;
  for (const edge of countryEdges) {
    typeCounts[edge.aidType] += edge.projectCount;
    total += edge.projectCount;
  }

  const breakdown: AidTypeBreakdown[] = [];
  for (const [aidType, count] of Object.entries(typeCounts) as [AidType, number][]) {
    breakdown.push({
      aidType,
      count,
      percentage: safeDiv(count * 100, total),
      weightedValue: count * AID_TYPE_WEIGHTS[aidType],
    });
  }

  return breakdown.sort((a, b) => b.count - a.count);
}

// ============================================================================
// Overlap / Centrality
// ============================================================================

/**
 * Computes overlap intensity (degree centrality) for a region
 */
export function computeOverlapIntensity(regionId: string, data: AppData): OverlapStat {
  const orgs = getOrgsForRegion(regionId, data);
  const totalOrgs = data.organizations.length;

  // Degree centrality: fraction of total orgs operating here
  const degreeCentrality = safeDiv(orgs.length, totalOrgs);

  // Find orgs that also operate in other regions (shared coverage)
  const region = data.regions.find(r => r.id === regionId);
  const countryId = region?.countryId;

  const sharedOrgs: string[] = [];
  if (countryId) {
    const countryRegionIds = new Set(
      data.regions
        .filter(r => r.countryId === countryId && r.id !== regionId)
        .map(r => r.id)
    );

    for (const org of orgs) {
      const orgRegions = data.aidEdges
        .filter(e => e.orgId === org.id)
        .map(e => e.regionId);

      const hasOtherRegions = orgRegions.some(rid => countryRegionIds.has(rid));
      if (hasOtherRegions) {
        sharedOrgs.push(org.name);
      }
    }
  }

  return {
    regionId,
    degreeCentrality,
    orgCount: orgs.length,
    sharedOrgs,
  };
}
