/**
 * Derived selectors for Shafaf UI
 * Computes derived values from the store for efficient re-rendering
 */

import { useViewStore } from './viewStore';
import type { MapPoint, WorldScore, RegionScore } from '@/core/data/schema';
import { COVERAGE_COLORS } from '@/core/graph/constants';

// ============================================================================
// Map Point Selectors
// ============================================================================

/**
 * Converts world scores to map points for rendering
 */
export function useWorldMapPoints(): MapPoint[] {
  const worldScores = useViewStore((state) => state.worldScores);
  const appData = useViewStore((state) => state.appData);

  if (!appData) return [];

  const points = worldScores.map((score) => {
    const country = appData.countries.find((c) => c.id === score.countryId);
    if (!country) return null;

    return {
      id: score.countryId,
      coordinates: country.centroid,
      value: score.rawCoverage,
      normalizedValue: score.normalizedCoverage,
      type: 'country' as const,
      name: score.countryName,
      data: score,
    };
  });

  return points.filter((p) => p !== null) as MapPoint[];
}

/**
 * Converts region scores to map points for rendering
 */
export function useRegionMapPoints(): MapPoint[] {
  const countryScores = useViewStore((state) => state.countryScores);
  const appData = useViewStore((state) => state.appData);

  if (!appData) return [];

  const points = countryScores.map((score) => {
    const region = appData.regions.find((r) => r.id === score.regionId);
    if (!region) return null;

    return {
      id: score.regionId,
      coordinates: region.centroid,
      value: score.rawCoverage,
      normalizedValue: score.normalizedCoverage,
      type: 'region' as const,
      name: score.regionName,
      data: score,
    };
  });

  return points.filter((p) => p !== null) as MapPoint[];
}

// ============================================================================
// Color Selectors
// ============================================================================

/**
 * Gets color for a normalized coverage value
 * Lower coverage (higher gap) = red, Higher coverage = green
 */
export function getCoverageColor(
  normalizedCoverage: number
): [number, number, number, number] {
  // Invert so that LOW coverage = HIGH gap = RED
  const gapValue = 1 - normalizedCoverage;

  if (gapValue > 0.66) {
    // High gap - red
    return [...COVERAGE_COLORS.HIGH_GAP, 200];
  } else if (gapValue > 0.33) {
    // Medium gap - yellow
    return [...COVERAGE_COLORS.MEDIUM_GAP, 180];
  } else {
    // Low gap - green
    return [...COVERAGE_COLORS.LOW_GAP, 160];
  }
}

/**
 * Gets interpolated color for smooth transitions
 */
export function getInterpolatedCoverageColor(
  normalizedCoverage: number
): [number, number, number, number] {
  // Invert so that LOW coverage = HIGH gap = RED
  const gapValue = 1 - normalizedCoverage;

  const red = COVERAGE_COLORS.HIGH_GAP;
  const yellow = COVERAGE_COLORS.MEDIUM_GAP;
  const green = COVERAGE_COLORS.LOW_GAP;

  let r: number, g: number, b: number;

  if (gapValue > 0.5) {
    // Interpolate between yellow and red
    const t = (gapValue - 0.5) * 2;
    r = yellow[0] + (red[0] - yellow[0]) * t;
    g = yellow[1] + (red[1] - yellow[1]) * t;
    b = yellow[2] + (red[2] - yellow[2]) * t;
  } else {
    // Interpolate between green and yellow
    const t = gapValue * 2;
    r = green[0] + (yellow[0] - green[0]) * t;
    g = green[1] + (yellow[1] - green[1]) * t;
    b = green[2] + (yellow[2] - green[2]) * t;
  }

  // Alpha based on gap intensity
  const alpha = 140 + gapValue * 80;

  return [Math.round(r), Math.round(g), Math.round(b), Math.round(alpha)];
}

// ============================================================================
// Summary Statistics
// ============================================================================

export interface WorldSummary {
  totalCountries: number;
  totalRegions: number;
  totalOrgs: number;
  totalAidEdges: number;
  averageCoverage: number;
  coverageVariance: number;
  highGapCount: number;
  lowGapCount: number;
}

/**
 * Computes summary statistics for world view
 */
export function useWorldSummary(): WorldSummary | null {
  const appData = useViewStore((state) => state.appData);
  const worldScores = useViewStore((state) => state.worldScores);

  if (!appData || worldScores.length === 0) return null;

  const coverages = worldScores.map((s) => s.normalizedCoverage);
  const mean = coverages.reduce((a, b) => a + b, 0) / coverages.length;
  const variance =
    coverages.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / coverages.length;

  return {
    totalCountries: appData.countries.length,
    totalRegions: appData.regions.length,
    totalOrgs: appData.organizations.length,
    totalAidEdges: appData.aidEdges.length,
    averageCoverage: mean,
    coverageVariance: variance,
    highGapCount: worldScores.filter((s) => s.normalizedCoverage < 0.33).length,
    lowGapCount: worldScores.filter((s) => s.normalizedCoverage > 0.66).length,
  };
}

export interface CountrySummary {
  countryName: string;
  totalRegions: number;
  totalOrgs: number;
  averageCoverage: number;
  coverageVariance: number;
  highGapRegions: RegionScore[];
  wellCoveredRegions: RegionScore[];
}

/**
 * Computes summary statistics for country view
 */
export function useCountrySummary(): CountrySummary | null {
  const appData = useViewStore((state) => state.appData);
  const selectedCountryId = useViewStore((state) => state.selectedCountryId);
  const countryScores = useViewStore((state) => state.countryScores);

  if (!appData || !selectedCountryId || countryScores.length === 0) return null;

  const country = appData.countries.find((c) => c.id === selectedCountryId);
  if (!country) return null;

  const coverages = countryScores.map((s) => s.normalizedCoverage);
  const mean = coverages.reduce((a, b) => a + b, 0) / coverages.length;
  const variance =
    coverages.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / coverages.length;

  // Get unique org count
  const regionIds = new Set(countryScores.map((s) => s.regionId));
  const orgIds = new Set(
    appData.aidEdges
      .filter((e) => regionIds.has(e.regionId))
      .map((e) => e.orgId)
  );

  return {
    countryName: country.name,
    totalRegions: countryScores.length,
    totalOrgs: orgIds.size,
    averageCoverage: mean,
    coverageVariance: variance,
    highGapRegions: countryScores
      .filter((s) => s.normalizedCoverage < 0.33)
      .sort((a, b) => a.normalizedCoverage - b.normalizedCoverage),
    wellCoveredRegions: countryScores
      .filter((s) => s.normalizedCoverage > 0.66)
      .sort((a, b) => b.normalizedCoverage - a.normalizedCoverage),
  };
}

// ============================================================================
// Selection Helpers
// ============================================================================

/**
 * Gets the currently selected country data
 */
export function useSelectedCountry() {
  const appData = useViewStore((state) => state.appData);
  const selectedCountryId = useViewStore((state) => state.selectedCountryId);

  if (!appData || !selectedCountryId) return null;
  return appData.countries.find((c) => c.id === selectedCountryId) || null;
}

/**
 * Gets the curated countries for the world view
 */
export function useCuratedCountries() {
  const appData = useViewStore((state) => state.appData);
  const worldScores = useViewStore((state) => state.worldScores);

  if (!appData) return [];

  const curatedCountries = appData.countries.filter((c) => c.curated);
  return curatedCountries.map((country) => {
    const score = worldScores.find((s) => s.countryId === country.id);
    return {
      country,
      score,
    };
  });
}
