/**
 * deck.gl layer factories for AidGap map visualization
 * Creates glow, pulse, and heat layers for coverage visualization
 */

import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { MapPoint } from '@/core/data/schema';
import { getInterpolatedCoverageColor } from '@/app_state/selectors';
import { MAP_CONFIG } from '@/core/graph/constants';

// ============================================================================
// Type Definitions
// ============================================================================

export interface LayerProps {
  points: MapPoint[];
  time: number;
  onPointClick?: (info: any) => void;
  onPointHover?: (info: any) => void;
  selectedId?: string | null;
  hoveredId?: string | null;
  mosqueMode?: boolean;
}

export interface GeoJsonLayerProps {
  data: GeoJSON.FeatureCollection;
  onFeatureClick?: (info: any) => void;
  onFeatureHover?: (info: any) => void;
  selectedId?: string | null;
  getColor?: (feature: GeoJSON.Feature) => [number, number, number, number];
}

// ============================================================================
// Base Point Layer
// ============================================================================

/**
 * Creates the base scatterplot layer for data points
 * Includes hover highlight effect
 * In mosque mode, uses smaller radii to match reduced glow.
 */
export function createBasePointLayer(props: LayerProps) {
  const { points, onPointClick, onPointHover, selectedId, hoveredId, mosqueMode } = props;
  const sizeScale = mosqueMode ? 0.28 : 1;
  const minPx = mosqueMode ? 4 : 8;
  const maxPx = mosqueMode ? 20 : 50;

  return new ScatterplotLayer({
    id: 'base-points',
    data: points,
    pickable: true,
    opacity: 0.9,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: minPx,
    radiusMaxPixels: maxPx,
    lineWidthMinPixels: 1,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      const baseSize = (20000 + d.value * 50000) * sizeScale;
      // Selected nodes are larger
      if (d.id === selectedId) return baseSize * 1.3;
      // Hovered nodes pop up slightly
      if (d.id === hoveredId) return baseSize * 1.15;
      return baseSize;
    },
    getFillColor: (d: MapPoint) => {
      const color = getInterpolatedCoverageColor(d.normalizedValue);
      // Brighten on hover
      if (d.id === hoveredId) {
        return [
          Math.min(255, color[0] + 30),
          Math.min(255, color[1] + 30),
          Math.min(255, color[2] + 30),
          255,
        ] as [number, number, number, number];
      }
      return color;
    },
    getLineColor: (d: MapPoint) => {
      if (d.id === selectedId) return [255, 255, 255, 255];
      if (d.id === hoveredId) return [255, 255, 255, 220];
      return [255, 255, 255, 100];
    },
    getLineWidth: (d: MapPoint) => {
      if (d.id === selectedId) return 3;
      if (d.id === hoveredId) return 2;
      return 1;
    },
    onClick: onPointClick,
    onHover: onPointHover,
    updateTriggers: {
      getRadius: [selectedId, hoveredId, mosqueMode],
      getFillColor: [hoveredId],
      getLineColor: [selectedId, hoveredId],
      getLineWidth: [selectedId, hoveredId],
    },
  });
}

// ============================================================================
// Glow Layer
// ============================================================================

/**
 * Creates a soft glow effect layer behind points
 * Responds to hover with brighter glow
 * In mosque mode, uses smaller radii for less overlap.
 */
export function createGlowLayer(props: LayerProps) {
  const { points, time, hoveredId, mosqueMode } = props;
  const sizeScale = mosqueMode ? 0.28 : 1;
  const minPx = mosqueMode ? 8 : 20;
  const maxPx = mosqueMode ? 40 : 100;

  return new ScatterplotLayer({
    id: 'glow-layer',
    data: points,
    pickable: false,
    opacity: MAP_CONFIG.GLOW_INTENSITY,
    stroked: false,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: minPx,
    radiusMaxPixels: maxPx,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      const baseSize = (30000 + d.value * 80000) * sizeScale;
      // Subtle breathing effect
      const breath = 1 + Math.sin(time * 2) * 0.1;
      // Expand glow on hover
      const hoverScale = d.id === hoveredId ? 1.3 : 1;
      return baseSize * breath * hoverScale;
    },
    getFillColor: (d: MapPoint) => {
      const color = getInterpolatedCoverageColor(d.normalizedValue);
      // Brighter glow on hover
      const alpha = d.id === hoveredId ? 100 : 60;
      return [color[0], color[1], color[2], alpha];
    },
    updateTriggers: {
      getRadius: [time, hoveredId, mosqueMode],
      getFillColor: [hoveredId],
    },
  });
}

// ============================================================================
// Pulse Ring Layer
// ============================================================================

/**
 * Creates animated pulse rings around high-gap areas
 * In mosque mode, uses smaller radii.
 */
export function createPulseLayer(props: LayerProps) {
  const { points, time, mosqueMode } = props;
  const sizeScale = mosqueMode ? 0.28 : 1;
  const minPx = mosqueMode ? 6 : 15;
  const maxPx = mosqueMode ? 40 : 100;

  // Filter to only show pulse for high-gap areas (low coverage)
  const highGapPoints = points.filter((p) => p.normalizedValue < 0.4);

  return new ScatterplotLayer({
    id: 'pulse-layer',
    data: highGapPoints,
    pickable: false,
    opacity: 1,
    stroked: true,
    filled: false,
    radiusScale: 1,
    radiusMinPixels: minPx,
    radiusMaxPixels: maxPx,
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 4,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      // Expanding pulse animation
      const pulsePhase = (time + d.id.charCodeAt(0) * 0.1) % 1;
      const expandFactor = 1 + pulsePhase * 1.5;
      return (25000 + d.value * 60000) * sizeScale * expandFactor;
    },
    getLineColor: (d: MapPoint) => {
      // Fade out as ring expands
      const pulsePhase = (time + d.id.charCodeAt(0) * 0.1) % 1;
      const alpha = Math.max(0, 200 * (1 - pulsePhase));
      // Red tint for high gap areas
      return [255, 100, 100, alpha];
    },
    getLineWidth: 2,
    updateTriggers: {
      getRadius: [time, mosqueMode],
      getLineColor: [time],
    },
  });
}

// ============================================================================
// Region Polygon Layer
// ============================================================================

/**
 * Creates a GeoJSON layer for region polygons
 */
export function createRegionPolygonLayer(props: GeoJsonLayerProps) {
  const { data, onFeatureClick, onFeatureHover, selectedId, getColor } = props;

  return new GeoJsonLayer({
    id: 'region-polygons',
    data,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    wireframe: false,
    lineWidthMinPixels: 1,
    getFillColor: (feature: GeoJSON.Feature) => {
      if (getColor) {
        return getColor(feature);
      }
      // Default color based on properties
      const coverage = (feature.properties?.normalizedCoverage as number) ?? 0.5;
      return getInterpolatedCoverageColor(coverage);
    },
    getLineColor: (feature: GeoJSON.Feature) => {
      if (feature.properties?.id === selectedId) {
        return [255, 255, 255, 255];
      }
      return [255, 255, 255, 80];
    },
    getLineWidth: (feature: GeoJSON.Feature) => {
      return feature.properties?.id === selectedId ? 3 : 1;
    },
    onClick: onFeatureClick,
    onHover: onFeatureHover,
    updateTriggers: {
      getLineColor: [selectedId],
      getLineWidth: [selectedId],
      getFillColor: [getColor],
    },
  });
}

// ============================================================================
// Combined Layer Factory
// ============================================================================

export interface AllLayersProps {
  points: MapPoint[];
  time: number;
  onPointClick?: (info: any) => void;
  onPointHover?: (info: any) => void;
  selectedId?: string | null;
  hoveredId?: string | null;
  showGlow?: boolean;
  showPulse?: boolean;
  mosqueMode?: boolean;
}

/**
 * Creates all point layers in correct render order
 */
export function createAllPointLayers(props: AllLayersProps) {
  const {
    points,
    time,
    onPointClick,
    onPointHover,
    selectedId,
    hoveredId,
    showGlow = true,
    showPulse = true,
    mosqueMode = false,
  } = props;

  const layers = [];

  // Glow layer (bottom)
  if (showGlow) {
    layers.push(createGlowLayer({ points, time, hoveredId, mosqueMode }));
  }

  // Pulse layer (middle)
  if (showPulse) {
    layers.push(createPulseLayer({ points, time, mosqueMode }));
  }

  // Base points (top)
  layers.push(
    createBasePointLayer({
      points,
      time,
      onPointClick,
      onPointHover,
      selectedId,
      hoveredId,
      mosqueMode,
    })
  );

  return layers;
}
