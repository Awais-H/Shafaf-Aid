/**
 * Region polygon utilities for Shafaf
 * Handles GeoJSON data processing for country view
 */

import type { RegionScore } from '@/core/data/schema';
import { getInterpolatedCoverageColor } from '@/app_state/selectors';

// ============================================================================
// Types
// ============================================================================

export interface RegionFeature extends GeoJSON.Feature {
  properties: {
    id: string;
    name: string;
    normalizedCoverage: number;
    rawCoverage: number;
    population: number;
    needLevel: string;
    overlap: number;
  };
}

export interface RegionFeatureCollection extends GeoJSON.FeatureCollection {
  features: RegionFeature[];
}

// ============================================================================
// GeoJSON Processing
// ============================================================================

/**
 * Merges region scores into GeoJSON features
 */
export function mergeScoresIntoGeoJson(
  geojson: GeoJSON.FeatureCollection | null,
  regionScores: RegionScore[]
): RegionFeatureCollection | null {
  if (!geojson) return null;

  const scoreMap = new Map(regionScores.map((s) => [s.regionId, s]));

  const features: RegionFeature[] = geojson.features
    .map((feature) => {
      const regionId = feature.properties?.id || feature.properties?.region_id;
      const score = scoreMap.get(regionId);

      if (!score) {
        // Region exists in GeoJSON but not in data - use default values
        return {
          ...feature,
          properties: {
            id: regionId || 'unknown',
            name: feature.properties?.name || 'Unknown Region',
            normalizedCoverage: 0.5,
            rawCoverage: 0,
            population: 0,
            needLevel: 'medium',
            overlap: 0,
          },
        } as RegionFeature;
      }

      return {
        ...feature,
        properties: {
          id: score.regionId,
          name: score.regionName,
          normalizedCoverage: score.normalizedCoverage,
          rawCoverage: score.rawCoverage,
          population: score.population,
          needLevel: score.needLevel,
          overlap: score.overlap,
        },
      } as RegionFeature;
    })
    .filter((f): f is RegionFeature => f !== null);

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Creates synthetic GeoJSON from region data when real polygons aren't available
 * Uses circular approximations centered on region centroids
 */
export function createSyntheticGeoJson(
  regionScores: RegionScore[],
  regionCentroids: Map<string, [number, number]>
): RegionFeatureCollection {
  const features: RegionFeature[] = regionScores.map((score) => {
    const centroid = regionCentroids.get(score.regionId) || [0, 0];
    
    // Create a small polygon around the centroid
    const radius = 0.5; // degrees
    const points = 8;
    const coordinates: [number, number][] = [];
    
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      coordinates.push([
        centroid[0] + Math.cos(angle) * radius,
        centroid[1] + Math.sin(angle) * radius * 0.8, // Slightly elliptical
      ]);
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
      properties: {
        id: score.regionId,
        name: score.regionName,
        normalizedCoverage: score.normalizedCoverage,
        rawCoverage: score.rawCoverage,
        population: score.population,
        needLevel: score.needLevel,
        overlap: score.overlap,
      },
    } as RegionFeature;
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

// ============================================================================
// Color Functions for Polygons
// ============================================================================

/**
 * Gets fill color for a region feature based on coverage
 */
export function getRegionFillColor(
  feature: GeoJSON.Feature
): [number, number, number, number] {
  const coverage = (feature.properties?.normalizedCoverage as number) ?? 0.5;
  return getInterpolatedCoverageColor(coverage);
}

/**
 * Gets outline color for a region feature
 */
export function getRegionLineColor(
  feature: GeoJSON.Feature,
  selectedId: string | null
): [number, number, number, number] {
  if (feature.properties?.id === selectedId) {
    return [255, 255, 255, 255];
  }
  return [255, 255, 255, 100];
}

// ============================================================================
// Filtering Utilities
// ============================================================================

/**
 * Filters regions by coverage threshold
 */
export function filterByGap(
  features: RegionFeature[],
  threshold: number = 0.33
): RegionFeature[] {
  return features.filter((f) => f.properties.normalizedCoverage < threshold);
}

/**
 * Sorts features by coverage (ascending - highest gaps first)
 */
export function sortByGap(features: RegionFeature[]): RegionFeature[] {
  return [...features].sort(
    (a, b) => a.properties.normalizedCoverage - b.properties.normalizedCoverage
  );
}

/**
 * Gets bounding box for a feature collection
 */
export function getFeaturesBounds(
  features: RegionFeature[]
): [number, number, number, number] | null {
  if (features.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const feature of features) {
    const coords = getAllCoordinates(feature.geometry);
    for (const [lng, lat] of coords) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Extracts all coordinates from a geometry
 */
function getAllCoordinates(geometry: GeoJSON.Geometry): [number, number][] {
  const coords: [number, number][] = [];

  if (geometry.type === 'Point') {
    coords.push(geometry.coordinates as [number, number]);
  } else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
    coords.push(...(geometry.coordinates as [number, number][]));
  } else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
    for (const ring of geometry.coordinates) {
      coords.push(...(ring as [number, number][]));
    }
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      for (const ring of polygon) {
        coords.push(...(ring as [number, number][]));
      }
    }
  }

  return coords;
}
