/**
 * Selectors for map points and coverage color
 * Uses view store (world/country scores, app data) to derive MapPoint[] and color helper
 */

import { useMemo } from 'react';
import { useViewStore } from '@/app_state/viewStore';
import type { MapPoint } from '@/core/data/schema';
import { COVERAGE_COLORS, CURATED_COUNTRIES } from '@/core/graph/constants';

/** Interpolate coverage color: 0 = red (high gap), 1 = green (low gap). */
export function getInterpolatedCoverageColor(
  normalizedValue: number
): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, normalizedValue));
  const [rL, gL, bL] = COVERAGE_COLORS.LOW_GAP;
  const [rH, gH, bH] = COVERAGE_COLORS.HIGH_GAP;
  return [
    Math.round(rH + (rL - rH) * t),
    Math.round(gH + (gL - gH) * t),
    Math.round(bH + (bL - bH) * t),
    255,
  ];
}

/** World map points from world scores (country-level). */
export function useWorldMapPoints(): MapPoint[] {
  const worldScores = useViewStore((s) => s.worldScores);
  const appData = useViewStore((s) => s.appData);

  return useMemo((): MapPoint[] => {
    if (!appData) return [];
    const countryMap = new Map(appData.countries.map((c) => [c.id, c]));
    const out: (MapPoint | null)[] = worldScores.map((score) => {
      const country = countryMap.get(score.countryId);
      if (!country || !Array.isArray(country.centroid) || country.centroid.length < 2)
        return null;
      const [lng, lat] = country.centroid;
      return {
        id: score.countryId,
        coordinates: [lng, lat],
        value: score.rawCoverage,
        normalizedValue: score.normalizedCoverage,
        type: 'country',
        name: score.countryName,
      } as MapPoint;
    });
    return out.filter((p): p is MapPoint => p != null);
  }, [worldScores, appData]);
}

/** Curated countries with scores for sidebar. */
export function useCuratedCountries(): { country: { id: string; name: string }; score: { normalizedCoverage: number } | null }[] {
  const appData = useViewStore((s) => s.appData);
  const worldScores = useViewStore((s) => s.worldScores);

  return useMemo(() => {
    if (!appData) return [];
    const scoreMap = new Map(worldScores.map((s) => [s.countryId, s]));
    return CURATED_COUNTRIES.map((id) => {
      const country = appData.countries.find((c) => c.id === id);
      const score = scoreMap.get(id) ?? null;
      return {
        country: { id, name: country?.name ?? id },
        score: score ? { normalizedCoverage: score.normalizedCoverage } : null,
      };
    });
  }, [appData, worldScores]);
}

/** Region map points from country scores (country view). */
export function useRegionMapPoints(): MapPoint[] {
  const countryScores = useViewStore((s) => s.countryScores);
  const appData = useViewStore((s) => s.appData);

  return useMemo((): MapPoint[] => {
    if (!appData) return [];
    const regionMap = new Map(appData.regions.map((r) => [r.id, r]));
    const out: (MapPoint | null)[] = countryScores.map((score) => {
      const region = regionMap.get(score.regionId);
      if (!region || !Array.isArray(region.centroid) || region.centroid.length < 2)
        return null;
      const [lng, lat] = region.centroid;
      return {
        id: score.regionId,
        coordinates: [lng, lat],
        value: score.rawCoverage,
        normalizedValue: score.normalizedCoverage,
        type: 'region',
        name: score.regionName,
      } as MapPoint;
    });
    return out.filter((p): p is MapPoint => p != null);
  }, [countryScores, appData]);
}
