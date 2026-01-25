/**
 * Mosque hotspot layers: 3-tier radii (country / city / mosque)
 * Same visual style (glow, pulse, base) as donor map; smaller, localized blobs.
 */

import { ScatterplotLayer } from '@deck.gl/layers';
import type { MapPoint } from '@/core/data/schema';
import type { HotspotScore } from '@/core/data/schema';
import { getInterpolatedCoverageColor } from '@/app_state/selectors';
import { MAP_CONFIG } from '@/core/graph/constants';

const RADIUS = {
  country: { min: 14, max: 24 },
  city: { min: 12, max: 20 },
  mosque: { min: 8, max: 14 },
} as const;

function getTier(d: MapPoint): HotspotScore['tier'] {
  const data = d.data as HotspotScore;
  return data?.tier ?? 'mosque';
}

function getTierRadiusPixels(tier: HotspotScore['tier'], scale = 1): number {
  const r = RADIUS[tier];
  return (r.min + (r.max - r.min) * 0.5) * scale;
}

export interface MosqueLayerProps {
  points: MapPoint[];
  time: number;
  onPointClick?: (info: any) => void;
  onPointHover?: (info: any) => void;
  selectedId?: string | null;
  hoveredId?: string | null;
  showGlow?: boolean;
  showPulse?: boolean;
}

function createMosqueGlowLayer(props: MosqueLayerProps) {
  const { points, time, hoveredId, showGlow = true } = props;
  if (!showGlow) return null;

  return new ScatterplotLayer({
    id: 'mosque-glow',
    data: points,
    pickable: false,
    radiusUnits: 'pixels',
    radiusScale: 1,
    radiusMinPixels: 4,
    radiusMaxPixels: 36,
    opacity: MAP_CONFIG.GLOW_INTENSITY,
    stroked: false,
    filled: true,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      const tier = getTier(d);
      const base = getTierRadiusPixels(tier);
      const breath = 1 + Math.sin(time * 2) * 0.05;
      const hoverScale = d.id === hoveredId ? 1.2 : 1;
      return base * breath * hoverScale;
    },
    getFillColor: (d: MapPoint) => {
      const color = getInterpolatedCoverageColor(d.normalizedValue);
      const alpha = d.id === hoveredId ? 100 : 60;
      return [color[0], color[1], color[2], alpha];
    },
    updateTriggers: { getRadius: [time, hoveredId], getFillColor: [hoveredId] },
  });
}

function createMosquePulseLayer(props: MosqueLayerProps) {
  const { points, time, showPulse = true } = props;
  if (!showPulse) return null;
  const highNeed = points.filter((p) => p.normalizedValue < 0.4);

  return new ScatterplotLayer({
    id: 'mosque-pulse',
    data: highNeed,
    pickable: false,
    radiusUnits: 'pixels',
    radiusScale: 1,
    radiusMinPixels: 5,
    radiusMaxPixels: 30,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 1.5,
    lineWidthMaxPixels: 2.5,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      const tier = getTier(d);
      const base = getTierRadiusPixels(tier);
      const pulsePhase = (time + d.id.charCodeAt(0) * 0.1) % 1;
      return base * (1 + pulsePhase * 0.8);
    },
    getLineColor: (d: MapPoint) => {
      const pulsePhase = (time + d.id.charCodeAt(0) * 0.1) % 1;
      const alpha = Math.max(0, 200 * (1 - pulsePhase));
      return [255, 100, 100, alpha];
    },
    updateTriggers: { getRadius: [time], getLineColor: [time] },
  });
}

function createMosqueBaseLayer(props: MosqueLayerProps) {
  const { points, onPointClick, onPointHover, selectedId, hoveredId } = props;

  return new ScatterplotLayer({
    id: 'mosque-base',
    data: points,
    pickable: true,
    radiusUnits: 'pixels',
    radiusScale: 1,
    radiusMinPixels: 4,
    radiusMaxPixels: 28,
    stroked: true,
    filled: true,
    lineWidthMinPixels: 1,
    getPosition: (d: MapPoint) => d.coordinates,
    getRadius: (d: MapPoint) => {
      const tier = getTier(d);
      let base = getTierRadiusPixels(tier);
      if (d.id === selectedId) base *= 1.3;
      else if (d.id === hoveredId) base *= 1.15;
      return base;
    },
    getFillColor: (d: MapPoint) => {
      const color = getInterpolatedCoverageColor(d.normalizedValue);
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
    getLineWidth: (d: MapPoint) => (d.id === selectedId ? 3 : d.id === hoveredId ? 2 : 1),
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

export function createMosqueHotspotLayers(props: MosqueLayerProps): any[] {
  const layers: any[] = [];
  const glow = createMosqueGlowLayer(props);
  if (glow) layers.push(glow);
  const pulse = createMosquePulseLayer(props);
  if (pulse) layers.push(pulse);
  layers.push(createMosqueBaseLayer(props));
  return layers;
}
