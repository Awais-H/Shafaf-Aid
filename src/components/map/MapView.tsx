'use client';

/**
 * Map view: DeckGL (reverse-controlled) + MapLibre base map.
 * Supports donor (world/country) and mosques modes, point + optional GeoJSON layers.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { DeckGL } from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapPoint } from '@/core/data/schema';
import { createAllPointLayers, createRegionPolygonLayer } from './Layers';
import { createMosqueHotspotLayers } from './LayersMosque';
import { getRegionFillColor } from './RegionPolygons';
import type { RegionFeatureCollection } from './RegionPolygons';
import { getMapStyleUrl, getWorldViewState } from './MapUtils';

export interface MapViewProps {
  points: MapPoint[];
  initialViewState?: { longitude: number; latitude: number; zoom: number; pitch?: number; bearing?: number } | null;
  onPointClick?: (point: MapPoint) => void;
  onRegionClick?: (regionId: string) => void;
  /** For country view: pass regionGeoJson from createSyntheticGeoJson. */
  regionGeoJson?: GeoJSON.FeatureCollection | RegionFeatureCollection | null;
  selectedId?: string | null;
  showGlow?: boolean;
  showPulse?: boolean;
  mode?: 'donor' | 'mosques';
  resizeKey?: string;
}

export default function MapView({
  points,
  initialViewState,
  onPointClick,
  onRegionClick,
  regionGeoJson,
  selectedId = null,
  showGlow = true,
  showPulse = true,
  mode = 'donor',
  resizeKey,
}: MapViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setTime((t) => t + 0.016);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handlePointClick = useCallback(
    (info: { object?: MapPoint }) => {
      if (info.object && onPointClick) onPointClick(info.object);
    },
    [onPointClick]
  );

  const handlePointHover = useCallback((info: { object?: MapPoint }) => {
    setHoveredId(info.object?.id ?? null);
  }, []);

  const handleRegionClick = useCallback(
    (info: { object?: GeoJSON.Feature }) => {
      const id = info.object?.properties && (info.object.properties as { id?: string }).id;
      if (id && onRegionClick) onRegionClick(id);
    },
    [onRegionClick]
  );

  const viewState = initialViewState ?? getWorldViewState();

  const layers = useMemo(() => {
    const all: any[] = [];
    if (mode === 'mosques') {
      all.push(
        ...createMosqueHotspotLayers({
          points,
          time,
          onPointClick: handlePointClick,
          onPointHover: handlePointHover,
          selectedId,
          hoveredId,
          showGlow,
          showPulse,
        })
      );
    } else {
      all.push(
        ...createAllPointLayers({
          points,
          time,
          onPointClick: handlePointClick,
          onPointHover: handlePointHover,
          selectedId,
          hoveredId,
          showGlow,
          showPulse,
        })
      );
    }
    if (regionGeoJson && mode === 'donor') {
      all.push(
        createRegionPolygonLayer({
          data: regionGeoJson as GeoJSON.FeatureCollection,
          onFeatureClick: handleRegionClick,
          selectedId,
          getColor: (f) => getRegionFillColor(f),
        })
      );
    }
    return all;
  }, [
    mode,
    points,
    time,
    handlePointClick,
    handlePointHover,
    handleRegionClick,
    selectedId,
    hoveredId,
    showGlow,
    showPulse,
    regionGeoJson,
  ]);

  return (
    <div className="relative w-full h-full">
      <DeckGL
        initialViewState={viewState}
        controller
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
      >
        <Map mapStyle={getMapStyleUrl()} />
      </DeckGL>
    </div>
  );
}
