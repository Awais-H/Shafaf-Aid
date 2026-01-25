/**
 * deck.gl layer factories for Shafaf Aid 2.0 map visualization
 * Creates dual-layer visualization: Choropleth + Proportional Circles
 */

import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { MapPoint } from '@/core/data/schema';
import { getInterpolatedCoverageColor, type EnhancedRegionPoint } from '@/app_state/selectors';
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
}

export interface EnhancedLayerProps extends LayerProps {
  points: EnhancedRegionPoint[];
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
 */
export function createBasePointLayer(props: LayerProps) {
  const { points, onPointClick, onPointHover, selectedId, hoveredId } = props;

  return new ScatterplotLayer({
    id: 'base-points',
    data: points,
    pickable: true,
    opacity: 0.9,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 8,
    radiusMaxPixels: 50,
    lineWidthMinPixels: 1,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      const baseSize = 20000 + d.value * 50000;
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
      getRadius: [selectedId, hoveredId],
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
 */
export function createGlowLayer(props: LayerProps) {
  const { points, time, hoveredId } = props;

  return new ScatterplotLayer({
    id: 'glow-layer',
    data: points,
    pickable: false,
    opacity: MAP_CONFIG.GLOW_INTENSITY,
    stroked: false,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 20,
    radiusMaxPixels: 100,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      const baseSize = 30000 + d.value * 80000;
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
      getRadius: [time, hoveredId],
      getFillColor: [hoveredId],
    },
  });
}

// ============================================================================
// Pulse Ring Layer
// ============================================================================

/**
 * Creates animated pulse rings around high-gap areas and top-priority regions
 */
export function createPulseLayer(props: LayerProps & { priorityRegionIds?: string[] }) {
  const { points, time, priorityRegionIds } = props;

  // Show pulse for high-gap areas (low coverage) OR top-priority regions
  const highGapPoints = points.filter(
    (p) => p.normalizedValue < 0.4 || (priorityRegionIds && priorityRegionIds.includes(p.id))
  );

  return new ScatterplotLayer({
    id: 'pulse-layer',
    data: highGapPoints,
    pickable: false,
    opacity: 1,
    stroked: true,
    filled: false,
    radiusScale: 1,
    radiusMinPixels: 15,
    radiusMaxPixels: 100,
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 4,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      // Expanding pulse animation
      const pulsePhase = (time + d.id.charCodeAt(0) * 0.1) % 1;
      const expandFactor = 1 + pulsePhase * 1.5;
      return (25000 + d.value * 60000) * expandFactor;
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
      getRadius: [time],
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
  /** Top priority region IDs – get pulsing red rings even if coverage &gt; 0.4 */
  priorityRegionIds?: string[];
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
    priorityRegionIds,
  } = props;

  const layers = [];

  // Glow layer (bottom)
  if (showGlow) {
    layers.push(createGlowLayer({ points, time, hoveredId }));
  }

  // Pulse layer (middle) – high-gap + priority regions
  if (showPulse) {
    layers.push(createPulseLayer({ points, time, priorityRegionIds }));
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
    })
  );

  return layers;
}

// ============================================================================
// Dual-Layer Visualization (Choropleth + Proportional Circles)
// ============================================================================

/**
 * Creates proportional circles layer showing project volume
 * Circle size = total project count, Color = coverage index
 */
export function createProportionalCirclesLayer(props: EnhancedLayerProps) {
  const { points, onPointClick, onPointHover, selectedId, hoveredId } = props;
  
  // Calculate max project count for normalization
  const maxProjects = Math.max(...points.map(p => p.totalProjectCount), 1);

  return new ScatterplotLayer({
    id: 'proportional-circles',
    data: points,
    pickable: true,
    opacity: 0.75,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 6,
    radiusMaxPixels: 45,
    lineWidthMinPixels: 1,
    getPosition: (d: EnhancedRegionPoint) => d.coordinates,
    getRadius: (d: EnhancedRegionPoint) => {
      // Radius based on project count (sqrt for area scaling)
      const normalized = d.totalProjectCount / maxProjects;
      const baseSize = 8000 + Math.sqrt(normalized) * 40000;
      if (d.id === selectedId) return baseSize * 1.2;
      if (d.id === hoveredId) return baseSize * 1.1;
      return baseSize;
    },
    getFillColor: (d: EnhancedRegionPoint) => {
      const color = getInterpolatedCoverageColor(d.normalizedValue);
      if (d.id === hoveredId) {
        return [color[0], color[1], color[2], 220] as [number, number, number, number];
      }
      return [color[0], color[1], color[2], 180] as [number, number, number, number];
    },
    getLineColor: (d: EnhancedRegionPoint) => {
      if (d.id === selectedId) return [255, 255, 255, 255];
      if (d.id === hoveredId) return [255, 255, 255, 200];
      return [255, 255, 255, 80];
    },
    getLineWidth: (d: EnhancedRegionPoint) => {
      if (d.id === selectedId) return 2;
      if (d.id === hoveredId) return 1.5;
      return 1;
    },
    onClick: onPointClick,
    onHover: onPointHover,
    updateTriggers: {
      getRadius: [selectedId, hoveredId, maxProjects],
      getFillColor: [hoveredId],
      getLineColor: [selectedId, hoveredId],
      getLineWidth: [selectedId, hoveredId],
    },
  });
}

export interface DualLayerProps {
  points: EnhancedRegionPoint[];
  regionGeoJson: GeoJSON.FeatureCollection | null;
  time: number;
  onPointClick?: (info: any) => void;
  onPointHover?: (info: any) => void;
  onRegionClick?: (info: any) => void;
  onRegionHover?: (info: any) => void;
  selectedId?: string | null;
  hoveredId?: string | null;
  showChoropleth?: boolean;
  showCircles?: boolean;
}

/**
 * Creates dual-layer visualization:
 * - Layer A (Choropleth): Region polygons colored by coverage
 * - Layer B (Proportional Circles): Circle size = project volume
 */
export function createDualLayers(props: DualLayerProps) {
  const {
    points,
    regionGeoJson,
    time,
    onPointClick,
    onPointHover,
    onRegionClick,
    onRegionHover,
    selectedId,
    hoveredId,
    showChoropleth = true,
    showCircles = true,
  } = props;

  const layers = [];

  // Layer A: Choropleth (bottom)
  if (showChoropleth && regionGeoJson) {
    layers.push(
      createRegionPolygonLayer({
        data: regionGeoJson,
        onFeatureClick: onRegionClick,
        onFeatureHover: onRegionHover,
        selectedId,
      })
    );
  }

  // Layer B: Proportional Circles (top)
  if (showCircles && points.length > 0) {
    layers.push(
      createProportionalCirclesLayer({
        points,
        time,
        onPointClick,
        onPointHover,
        selectedId,
        hoveredId,
      })
    );
  }

  return layers;
}
