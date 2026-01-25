'use client';

/**
 * 3D Globe View component
 * Displays data on a rotating 3D globe with country outlines
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
// @ts-ignore
import { _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { ScatterplotLayer, GeoJsonLayer } from '@deck.gl/layers';
import type { MapPoint } from '@/core/data/schema';
import { getInterpolatedCoverageColor } from '@/app_state/selectors';
import { MAP_CONFIG } from '@/core/graph/constants';

// ============================================================================
// Types
// ============================================================================

interface GlobeViewProps {
  points: MapPoint[];
  onPointClick?: (point: MapPoint) => void;
  introComplete?: boolean;
  onIntroComplete?: () => void;
  autoRotate?: boolean;
}

interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

// ============================================================================
// Component
// ============================================================================

export default function GlobeMapView({
  points,
  onPointClick,
  introComplete = false,
  onIntroComplete,
  autoRotate = true,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [geoData, setGeoData] = useState<any>(null);

  const [viewState, setViewState] = useState<GlobeViewState>({
    longitude: 30,
    latitude: 15,
    zoom: 1.0,
  });

  const [hasInteracted, setHasInteracted] = useState(false);
  const [animationTime, setAnimationTime] = useState(0);
  const animationRef = useRef<number>();
  const rotationRef = useRef<number>();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    object: MapPoint | null;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load GeoJSON data
  useEffect(() => {
    fetch('/world-simplified.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load world geo data:', err));
  }, []);

  // Track container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Auto-rotation
  useEffect(() => {
    if (hasInteracted || introComplete) return;
    if (!autoRotate) return;

    const rotate = () => {
      setViewState(prev => ({
        ...prev,
        longitude: prev.longitude + 0.02,
      }));
      rotationRef.current = requestAnimationFrame(rotate);
    };

    rotationRef.current = requestAnimationFrame(rotate);

    return () => {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
      }
    };
  }, [autoRotate, hasInteracted, introComplete]);

  // Animation loop for marker breathing
  useEffect(() => {
    const animate = () => {
      setAnimationTime(prev => (prev + MAP_CONFIG.PULSE_SPEED) % 1);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleViewStateChange = useCallback(
    ({ viewState: newViewState }: { viewState: GlobeViewState }) => {
      setViewState(newViewState);

      if (!hasInteracted && newViewState.zoom > 1.3) {
        setHasInteracted(true);
        onIntroComplete?.();
      }
    },
    [hasInteracted, onIntroComplete]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!introComplete && !hasInteracted) {
      const zoomDelta = e.deltaY > 0 ? 0.04 : -0.04;
      setViewState(prev => {
        const newZoom = Math.max(0.6, Math.min(3, prev.zoom + zoomDelta));

        if (newZoom > 1.4 && !hasInteracted) {
          setHasInteracted(true);
          onIntroComplete?.();
        }

        return { ...prev, zoom: newZoom };
      });
    }
  }, [introComplete, hasInteracted, onIntroComplete]);

  const handlePointClick = useCallback(
    (info: { object?: MapPoint }) => {
      if (info.object && onPointClick) {
        onPointClick(info.object);
      }
    },
    [onPointClick]
  );

  const handlePointHover = useCallback((info: { object?: MapPoint; x: number; y: number }) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if (info.object) {
      const point = info.object;
      setHoverInfo({ x: info.x, y: info.y, object: point });
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredId(point.id);
      }, 50);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredId(null);
        setHoverInfo(null);
      }, 80);
    }
  }, []);

  // Create layers
  const layers = useMemo(() => {
    const result = [];

    // Country outlines layer
    if (geoData) {
      result.push(
        new GeoJsonLayer({
          id: 'country-outlines',
          data: geoData,
          pickable: false,
          stroked: true,
          filled: true,
          lineWidthMinPixels: 0.5,
          lineWidthMaxPixels: 2,
          getLineColor: [60, 60, 60, 200],
          getFillColor: [30, 30, 30, 40],
          getLineWidth: 1,
        })
      );
    }

    // Glow layer for data points
    result.push(
      new ScatterplotLayer({
        id: 'marker-glow',
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
          const baseSize = 60000 + d.value * 120000;
          const breath = 1 + Math.sin(animationTime * Math.PI * 2) * 0.1;
          const hoverScale = d.id === hoveredId ? 1.3 : 1;
          return baseSize * breath * hoverScale;
        },
        getFillColor: (d: MapPoint) => {
          const color = getInterpolatedCoverageColor(d.normalizedValue);
          const alpha = d.id === hoveredId ? 100 : 60;
          return [color[0], color[1], color[2], alpha];
        },
        updateTriggers: {
          getRadius: [animationTime, hoveredId],
          getFillColor: [hoveredId],
        },
      })
    );

    // Main markers
    result.push(
      new ScatterplotLayer({
        id: 'markers',
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
          if (d.id === hoveredId) return baseSize * 1.15;
          return baseSize;
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
          if (d.id === hoveredId) return [255, 255, 255, 220];
          return [255, 255, 255, 100];
        },
        getLineWidth: (d: MapPoint) => {
          if (d.id === hoveredId) return 2;
          return 1;
        },
        onClick: handlePointClick,
        onHover: handlePointHover,
        updateTriggers: {
          getRadius: [hoveredId],
          getFillColor: [hoveredId],
          getLineColor: [hoveredId],
        },
      })
    );

    return result;
  }, [geoData, points, animationTime, hoveredId, handlePointClick, handlePointHover]);

  const views = useMemo(() => [
    new DeckGlobeView({
      id: 'globe',
      resolution: 10,
    }),
  ], []);

  // Calculate the actual globe size in pixels
  const minDim = Math.min(containerSize.width, containerSize.height);
  const globeDiameter = minDim * 0.42 * Math.pow(2, viewState.zoom - 1);

  // Cast DeckGL to any to avoid prop type errors
  const DeckGLComponent = DeckGL as any;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center"
      style={{ background: 'transparent' }}
      onWheel={handleWheel}
    >
      {/* White circle background that matches globe */}
      {containerSize.width > 0 && (
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: `${globeDiameter}px`,
            height: `${globeDiameter}px`,
            background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #f5f5f5 50%, #e8e8e8 80%, #d8d8d8 100%)',
            boxShadow: '0 4px 60px rgba(0,0,0,0.3)',
            transition: 'width 0.15s ease-out, height 0.15s ease-out',
          }}
        />
      )}

      {/* DeckGL Globe */}
      <div className="absolute inset-0">
        <DeckGLComponent
          views={views}
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={{
            scrollZoom: introComplete || hasInteracted,
            dragPan: introComplete || hasInteracted,
            dragRotate: true,
            doubleClickZoom: true,
            touchZoom: true,
            touchRotate: true,
            keyboard: true,
          }}
          layers={layers}
          getCursor={({ isHovering }: { isHovering: boolean }) => {
            if (isHovering) return 'pointer';
            return 'grab';
          }}
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Hover Tooltip */}
      {hoverInfo && hoverInfo.object && (
        <div
          className="absolute pointer-events-none text-white px-3 py-2 rounded-lg shadow-lg text-sm"
          style={{
            left: hoverInfo.x + 10,
            top: hoverInfo.y + 10,
            zIndex: 50,
            background: 'rgba(10, 10, 10, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="font-semibold">{hoverInfo.object.name}</div>
          <div className="text-gray-300 text-xs mt-1">
            Coverage: {(hoverInfo.object.normalizedValue * 100).toFixed(1)}%
          </div>
          <div className="text-gray-400 text-xs">
            Click for details
          </div>
        </div>
      )}
    </div>
  );
}
