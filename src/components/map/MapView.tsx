'use client';

/**
 * Main map view component for Shafaf Aid 2.0
 * Integrates MapLibre GL JS with deck.gl for dual-layer visualization
 * Includes focus transitions and enhanced tooltips with sparklines
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Map from 'react-map-gl/maplibre';
import { FlyToInterpolator } from '@deck.gl/core';
import { DeckGL } from '@deck.gl/react';
import type { MapViewState, MapPoint, RegionScore, ViewportBounds } from '@/core/data/schema';
import { useViewStore } from '@/app_state/viewStore';
import { createAllPointLayers, createRegionPolygonLayer, createDualLayers } from './Layers';
import { getMapStyleUrl, fitBounds } from './MapUtils';
import { MAP_CONFIG, NEED_FACTORS } from '@/core/graph/constants';
import { useEnhancedRegionPoints, useCountryBounds, type EnhancedRegionPoint } from '@/app_state/selectors';
import type { RegionFeatureCollection } from './RegionPolygons';

import 'maplibre-gl/dist/maplibre-gl.css';

// ============================================================================
// Types
// ============================================================================

interface MapViewProps {
  points: MapPoint[];
  regionGeoJson?: RegionFeatureCollection | null;
  onPointClick?: (point: MapPoint) => void;
  onRegionClick?: (regionId: string) => void;
  selectedId?: string | null;
  showGlow?: boolean;
  showPulse?: boolean;
  initialViewState?: MapViewState;
  /** Top priority region IDs – pulse red rings (Action Mode) */
  priorityRegionIds?: string[];
}

// ============================================================================
// Component
// ============================================================================

export default function MapView({
  points,
  regionGeoJson,
  onPointClick,
  onRegionClick,
  selectedId,
  showGlow = true,
  showPulse = true,
  initialViewState,
  priorityRegionIds = [],
}: MapViewProps) {
  const setMapViewState = useViewStore((state) => state.setMapViewState);
  const storeViewState = useViewStore((state) => state.mapViewState);
  
  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const animationRef = useRef<number>();
  
  // View state
  const [viewState, setViewState] = useState<MapViewState>(
    initialViewState || {
      longitude: MAP_CONFIG.INITIAL_VIEW.longitude,
      latitude: MAP_CONFIG.INITIAL_VIEW.latitude,
      zoom: MAP_CONFIG.INITIAL_VIEW.zoom,
      pitch: MAP_CONFIG.INITIAL_VIEW.pitch,
      bearing: MAP_CONFIG.INITIAL_VIEW.bearing,
    }
  );

  // Hover state for tooltips
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    object: MapPoint | null;
  } | null>(null);
  
  // Delayed hover ID for smooth transitions
  const [delayedHoverId, setDelayedHoverId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation loop for pulse/glow effects
  useEffect(() => {
    const animate = () => {
      setAnimationTime((prev) => (prev + MAP_CONFIG.PULSE_SPEED) % 1);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Update view state when initialViewState changes
  useEffect(() => {
    if (initialViewState) {
      setViewState(initialViewState);
    }
  }, [initialViewState]);

  // Handle view state changes
  const handleViewStateChange = useCallback(
    ({ viewState: newViewState }: { viewState: MapViewState }) => {
      setViewState(newViewState);
      setMapViewState(newViewState);
    },
    [setMapViewState]
  );

  // Handle point click
  const handlePointClick = useCallback(
    (info: any) => {
      if (info.object && onPointClick) {
        onPointClick(info.object as MapPoint);
      }
    },
    [onPointClick]
  );

  // Handle point hover with slight delay for smooth effect
  const handlePointHover = useCallback((info: any) => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (info.object) {
      const point = info.object as MapPoint;
      setHoverInfo({
        x: info.x,
        y: info.y,
        object: point,
      });
      // Small delay before applying hover effect
      hoverTimeoutRef.current = setTimeout(() => {
        setDelayedHoverId(point.id);
      }, 50);
    } else {
      setHoverInfo(null);
      // Slightly longer delay when leaving for smoother exit
      hoverTimeoutRef.current = setTimeout(() => {
        setDelayedHoverId(null);
      }, 80);
    }
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle region polygon click
  const handleRegionClick = useCallback(
    (info: any) => {
      const regionId = info.object?.properties?.id;
      if (regionId && onRegionClick) {
        onRegionClick(regionId);
      }
    },
    [onRegionClick]
  );

  // Use delayed hover ID for smooth highlight effect
  const hoveredId = delayedHoverId;

  // Build layers
  const layers = [];

  // Add region polygons if available (for country view)
  if (regionGeoJson) {
    layers.push(
      createRegionPolygonLayer({
        data: regionGeoJson,
        onFeatureClick: handleRegionClick,
        onFeatureHover: handlePointHover,
        selectedId,
      })
    );
  }

  // Add point layers
  layers.push(
    ...createAllPointLayers({
      points,
      time: animationTime,
      onPointClick: handlePointClick,
      onPointHover: handlePointHover,
      selectedId,
      hoveredId,
      showGlow,
      showPulse,
      priorityRegionIds,
    })
  );

  return (
    <div className="relative w-full h-full">
      <DeckGL
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
      >
        <Map
          mapStyle={getMapStyleUrl()}
          attributionControl={false}
        />
      </DeckGL>

      {/* Hover Tooltip */}
      {hoverInfo && hoverInfo.object && (
        <MapTooltip
          x={hoverInfo.x}
          y={hoverInfo.y}
          object={hoverInfo.object}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Tooltip with Coverage Index breakdown + Mini Sparkline
// -----------------------------------------------------------------------------

function isRegionFeature(obj: unknown): obj is { properties: { id: string; name: string; normalizedCoverage: number; rawCoverage: number; population: number; needLevel: string } } {
  return typeof obj === 'object' && obj !== null && 'properties' in obj && typeof (obj as { properties?: unknown }).properties === 'object';
}

interface TooltipProps {
  x: number;
  y: number;
  object: MapPoint | EnhancedRegionPoint | GeoJSON.Feature;
}

function MapTooltip({ x, y, object }: TooltipProps) {
  const isEnhancedPoint = 'aidBreakdown' in object;
  const isPoint = 'normalizedValue' in object && 'data' in object;
  const point = isPoint ? (object as MapPoint) : null;
  const enhancedPoint = isEnhancedPoint ? (object as EnhancedRegionPoint) : null;
  const feature = !isPoint && isRegionFeature(object) ? object : null;

  const name = point?.name ?? feature?.properties?.name ?? 'Unknown';
  const normalized = point?.normalizedValue ?? feature?.properties?.normalizedCoverage ?? 0.5;
  const rawCoverage = point?.data && (point.data as RegionScore).rawCoverage != null
    ? (point.data as RegionScore).rawCoverage
    : feature?.properties?.rawCoverage;
  const population = point?.data && (point.data as RegionScore).population != null
    ? (point.data as RegionScore).population
    : feature?.properties?.population;
  const needLevel = (point?.data && (point.data as RegionScore).needLevel) ?? feature?.properties?.needLevel;
  const needFactor = needLevel ? NEED_FACTORS[needLevel as keyof typeof NEED_FACTORS] : null;
  const hasBreakdown = typeof rawCoverage === 'number' && typeof population === 'number' && needFactor != null;
  const weightedAid = hasBreakdown
    ? rawCoverage * (population / 1000) * needFactor
    : null;

  // Aid breakdown for sparkline
  const aidBreakdown = enhancedPoint?.aidBreakdown;
  const totalProjects = enhancedPoint?.totalProjectCount ?? 0;

  const formatPop = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

  return (
    <div
      className="absolute pointer-events-none z-10 glass text-white px-3 py-2.5 rounded-lg shadow-xl text-sm max-w-xs font-inter"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="font-semibold text-white">{name}</div>
      <div className="text-slate-300 text-xs mt-1 font-mono tabular-nums">
        Coverage: <span className="font-medium text-cyan-300">{(normalized * 100).toFixed(1)}%</span>
        {hasBreakdown && (
          <span className="text-slate-500 ml-1">(raw: {rawCoverage.toFixed(3)})</span>
        )}
      </div>

      {/* Mini Sparkline Bar */}
      {aidBreakdown && totalProjects > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-600/40">
          <div className="text-xs text-slate-500 mb-1.5 flex justify-between">
            <span>Aid Distribution</span>
            <span className="font-mono">{totalProjects} projects</span>
          </div>
          <SparklineBar breakdown={aidBreakdown} total={totalProjects} />
        </div>
      )}

      {hasBreakdown && (
        <div className="text-slate-400 text-xs mt-2 pt-2 border-t border-slate-600/40 space-y-0.5">
          <div className="text-slate-500 uppercase tracking-wider text-[10px] mb-1">Index Components</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono tabular-nums">
            <span className="text-slate-500">Weighted aid</span>
            <span className="text-right">{weightedAid != null ? weightedAid.toFixed(1) : '—'}</span>
            <span className="text-slate-500">Population</span>
            <span className="text-right">{formatPop(population)}</span>
            <span className="text-slate-500">Need factor</span>
            <span className="text-right">×{needFactor}</span>
          </div>
        </div>
      )}
      <div className="text-slate-500 text-xs mt-2 pt-1 border-t border-slate-700/30">Click for details</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Mini Sparkline Bar Component
// -----------------------------------------------------------------------------

interface SparklineBarProps {
  breakdown: { food: number; medical: number; infrastructure: number };
  total: number;
}

function SparklineBar({ breakdown, total }: SparklineBarProps) {
  const foodPct = (breakdown.food / total) * 100;
  const medPct = (breakdown.medical / total) * 100;
  const infraPct = (breakdown.infrastructure / total) * 100;

  return (
    <div className="flex items-end gap-1 h-6">
      {/* SVG Sparkline */}
      <svg width="100%" height="24" className="flex-1">
        {/* Food bar */}
        <rect
          x="0%"
          y={24 - (foodPct / 100) * 20}
          width="30%"
          height={(foodPct / 100) * 20}
          fill="#22c55e"
          rx="2"
          className="sparkline-bar"
        />
        {/* Medical bar */}
        <rect
          x="35%"
          y={24 - (medPct / 100) * 20}
          width="30%"
          height={(medPct / 100) * 20}
          fill="#ef4444"
          rx="2"
          className="sparkline-bar"
        />
        {/* Infrastructure bar */}
        <rect
          x="70%"
          y={24 - (infraPct / 100) * 20}
          width="30%"
          height={(infraPct / 100) * 20}
          fill="#3b82f6"
          rx="2"
          className="sparkline-bar"
        />
      </svg>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Focus Transition Hook
// -----------------------------------------------------------------------------

export function useFocusTransition(
  bounds: ViewportBounds | null,
  containerRef: React.RefObject<HTMLDivElement | null>
): MapViewState | null {
  const [targetView, setTargetView] = useState<MapViewState | null>(null);

  useEffect(() => {
    if (!bounds || !containerRef.current) {
      setTargetView(null);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const newView = fitBounds(bounds, rect.width, rect.height);
    
    setTargetView({
      ...newView,
      transitionDuration: 1500,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.5 }),
    } as MapViewState);
  }, [bounds, containerRef]);

  return targetView;
}
