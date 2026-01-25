/**
 * Map utility functions for Shafaf
 * Provides zoom, bounds, and view transition helpers
 */

import type { MapViewState, ViewportBounds } from '@/core/data/schema';
import { MAP_CONFIG } from '@/core/graph/constants';

// ============================================================================
// View State Utilities
// ============================================================================

/**
 * Creates a view state centered on coordinates
 */
export function createViewState(
  longitude: number,
  latitude: number,
  zoom: number
): MapViewState {
  return {
    longitude,
    latitude,
    zoom,
    pitch: 0,
    bearing: 0,
  };
}

/**
 * Calculates bounds from a set of coordinates
 */
export function calculateBounds(
  coordinates: [number, number][]
): ViewportBounds {
  if (coordinates.length === 0) {
    return {
      minLng: -180,
      maxLng: 180,
      minLat: -90,
      maxLat: 90,
    };
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return { minLng, maxLng, minLat, maxLat };
}

/**
 * Calculates center point from bounds
 */
export function calculateCenter(
  bounds: ViewportBounds
): [number, number] {
  return [
    (bounds.minLng + bounds.maxLng) / 2,
    (bounds.minLat + bounds.maxLat) / 2,
  ];
}

/**
 * Calculates appropriate zoom level for bounds
 */
export function calculateZoomForBounds(
  bounds: ViewportBounds,
  viewportWidth: number,
  viewportHeight: number
): number {
  const lngDiff = bounds.maxLng - bounds.minLng;
  const latDiff = bounds.maxLat - bounds.minLat;

  // Simple calculation - more sophisticated would use Mercator projection
  const lngZoom = Math.log2((360 * viewportWidth) / (256 * lngDiff)) - 1;
  const latZoom = Math.log2((180 * viewportHeight) / (256 * latDiff)) - 1;

  // Use the smaller zoom to fit both dimensions
  const zoom = Math.min(lngZoom, latZoom);
  
  // Clamp to reasonable range
  return Math.max(1, Math.min(18, zoom - 0.5));
}

/**
 * Creates view state to fit bounds
 */
export function fitBounds(
  bounds: ViewportBounds,
  viewportWidth: number,
  viewportHeight: number
): MapViewState {
  const center = calculateCenter(bounds);
  const zoom = calculateZoomForBounds(bounds, viewportWidth, viewportHeight);

  return createViewState(center[0], center[1], zoom);
}

// ============================================================================
// Navigation Helpers
// ============================================================================

/**
 * Creates view state for world view
 */
export function getWorldViewState(): MapViewState {
  return {
    longitude: MAP_CONFIG.INITIAL_VIEW.longitude,
    latitude: MAP_CONFIG.INITIAL_VIEW.latitude,
    zoom: MAP_CONFIG.WORLD_ZOOM,
    pitch: 0,
    bearing: 0,
  };
}

/**
 * Creates view state for a country
 */
export function getCountryViewState(
  centroid: [number, number]
): MapViewState {
  return createViewState(centroid[0], centroid[1], MAP_CONFIG.COUNTRY_ZOOM);
}

/**
 * Creates view state for a region
 */
export function getRegionViewState(
  centroid: [number, number]
): MapViewState {
  return createViewState(centroid[0], centroid[1], MAP_CONFIG.REGION_ZOOM);
}

// ============================================================================
// Viewport Utilities
// ============================================================================

/**
 * Extracts viewport bounds from current view state
 */
export function getViewportBounds(
  viewState: MapViewState,
  viewportWidth: number,
  viewportHeight: number
): ViewportBounds {
  // Approximate calculation of visible bounds
  const metersPerPixel = (156543.03392 * Math.cos((viewState.latitude * Math.PI) / 180)) /
    Math.pow(2, viewState.zoom);
  
  const halfWidthDeg = (viewportWidth * metersPerPixel) / 111320 / 2;
  const halfHeightDeg = (viewportHeight * metersPerPixel) / 110540 / 2;

  return {
    minLng: viewState.longitude - halfWidthDeg,
    maxLng: viewState.longitude + halfWidthDeg,
    minLat: viewState.latitude - halfHeightDeg,
    maxLat: viewState.latitude + halfHeightDeg,
  };
}

/**
 * Checks if a point is within bounds
 */
export function isPointInBounds(
  point: [number, number],
  bounds: ViewportBounds
): boolean {
  const [lng, lat] = point;
  return (
    lng >= bounds.minLng &&
    lng <= bounds.maxLng &&
    lat >= bounds.minLat &&
    lat <= bounds.maxLat
  );
}

// ============================================================================
// Animation Utilities
// ============================================================================

/**
 * Interpolates between two view states
 */
export function interpolateViewState(
  from: MapViewState,
  to: MapViewState,
  t: number
): MapViewState {
  const easeT = easeInOutCubic(t);
  
  return {
    longitude: from.longitude + (to.longitude - from.longitude) * easeT,
    latitude: from.latitude + (to.latitude - from.latitude) * easeT,
    zoom: from.zoom + (to.zoom - from.zoom) * easeT,
    pitch: from.pitch + (to.pitch - from.pitch) * easeT,
    bearing: from.bearing + (to.bearing - from.bearing) * easeT,
  };
}

/**
 * Easing function for smooth transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ============================================================================
// Tile URL Helpers
// ============================================================================

/**
 * Gets the map style URL, with fallback for offline mode
 */
export function getMapStyleUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_MAP_TILES_URL;
  return envUrl || MAP_CONFIG.DEFAULT_STYLE;
}

/**
 * Offline fallback style (simple vector style without external tiles)
 */
export function getOfflineFallbackStyle(): object {
  return {
    version: 8,
    sources: {
      'osm': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#1a1a2e' },
      },
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        paint: { 'raster-opacity': 0.3 },
      },
    ],
  };
}
