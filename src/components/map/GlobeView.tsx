'use client';

/**
 * 3D Globe View component
 * Displays data on a rotating 3D globe with dot-matrix styling
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { DeckGL } from '@deck.gl/react';
import { _GlobeView as DeckGlobeView } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';
import type { MapPoint } from '@/core/data/schema';
import { getInterpolatedCoverageColor } from '@/app_state/selectors';

// ============================================================================
// Types
// ============================================================================

interface GlobeViewProps {
  points: MapPoint[];
  onPointClick?: (point: MapPoint) => void;
  scrollProgress?: number; // 0 = globe view, 1 = flat view
  autoRotate?: boolean;
}

interface GlobeViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

// ============================================================================
// Globe Dot Grid Generation
// ============================================================================

interface GlobeDot {
  position: [number, number, number];
  color: [number, number, number, number];
}

/**
 * Generates a grid of dots on a sphere surface
 */
function generateGlobeDots(density: number = 80): GlobeDot[] {
  const dots: GlobeDot[] = [];
  
  // Generate dots using fibonacci sphere distribution for even spacing
  const numPoints = density * density;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  
  for (let i = 0; i < numPoints; i++) {
    const y = 1 - (i / (numPoints - 1)) * 2; // -1 to 1
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    
    // Convert to lng/lat for deck.gl
    const lng = Math.atan2(z, x) * (180 / Math.PI);
    const lat = Math.asin(y) * (180 / Math.PI);
    
    // Skip some dots for land/water pattern effect
    const noise = Math.sin(lng * 0.1) * Math.cos(lat * 0.1);
    if (Math.random() > 0.3 + noise * 0.2) continue;
    
    dots.push({
      position: [lng, lat, 0],
      color: [10, 10, 10, 255], // Very dark dots
    });
  }
  
  return dots;
}

// ============================================================================
// Component
// ============================================================================

export default function GlobeMapView({
  points,
  onPointClick,
  scrollProgress = 0,
  autoRotate = true,
}: GlobeViewProps) {
  // View state
  const [viewState, setViewState] = useState<GlobeViewState>({
    longitude: -40,
    latitude: 20,
    zoom: 0.8,
  });
  
  // Animation state
  const [animationTime, setAnimationTime] = useState(0);
  const animationRef = useRef<number>();
  const rotationRef = useRef<number>();
  
  // Hover state
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate globe dots once
  const globeDots = useMemo(() => generateGlobeDots(70), []);
  
  // Auto-rotation
  useEffect(() => {
    if (!autoRotate) return;
    
    const rotate = () => {
      setViewState(prev => ({
        ...prev,
        longitude: prev.longitude + 0.05,
      }));
      rotationRef.current = requestAnimationFrame(rotate);
    };
    
    rotationRef.current = requestAnimationFrame(rotate);
    
    return () => {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
      }
    };
  }, [autoRotate]);
  
  // Animation loop for effects
  useEffect(() => {
    const animate = () => {
      setAnimationTime(prev => (prev + 0.002) % 1);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  // Cleanup hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle view state changes
  const handleViewStateChange = useCallback(
    ({ viewState: newViewState }: { viewState: GlobeViewState }) => {
      setViewState(newViewState);
    },
    []
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

  // Handle point hover
  const handlePointHover = useCallback((info: any) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (info.object) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredId((info.object as MapPoint).id);
      }, 50);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredId(null);
      }, 80);
    }
  }, []);

  // Create layers
  const layers = useMemo(() => {
    const result = [];
    
    // Globe dot grid layer (background)
    result.push(
      new ScatterplotLayer({
        id: 'globe-dots',
        data: globeDots,
        pickable: false,
        opacity: 0.8,
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 1.5,
        radiusMaxPixels: 2.5,
        getPosition: (d: GlobeDot) => d.position,
        getRadius: 15000,
        getFillColor: [30, 30, 30, 255],
      })
    );
    
    // Glow layer for data points
    result.push(
      new ScatterplotLayer({
        id: 'globe-glow',
        data: points,
        pickable: false,
        opacity: 0.6,
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 20,
        radiusMaxPixels: 80,
        getPosition: (d: MapPoint) => d.coordinates,
        getRadius: (d: MapPoint) => {
          const baseSize = 80000 + d.value * 150000;
          const breath = 1 + Math.sin(animationTime * Math.PI * 2) * 0.1;
          const hoverScale = d.id === hoveredId ? 1.3 : 1;
          return baseSize * breath * hoverScale;
        },
        getFillColor: (d: MapPoint) => {
          // Warm orange/red glow
          const isHighGap = d.normalizedValue < 0.5;
          if (isHighGap) {
            return [255, 106, 61, 80]; // Warm orange glow
          }
          return [255, 150, 100, 60];
        },
        updateTriggers: {
          getRadius: [animationTime, hoveredId],
        },
      })
    );
    
    // Main data points
    result.push(
      new ScatterplotLayer({
        id: 'globe-points',
        data: points,
        pickable: true,
        opacity: 1,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 8,
        radiusMaxPixels: 40,
        lineWidthMinPixels: 1,
        getPosition: (d: MapPoint) => d.coordinates,
        getRadius: (d: MapPoint) => {
          const baseSize = 40000 + d.value * 80000;
          if (d.id === hoveredId) return baseSize * 1.2;
          return baseSize;
        },
        getFillColor: (d: MapPoint) => {
          // Warm orange for markers - matching design system
          const brightness = d.id === hoveredId ? 1.2 : 1;
          return [
            Math.min(255, 255 * brightness),
            Math.min(255, 77 * brightness),
            Math.min(255, 45 * brightness),
            255,
          ] as [number, number, number, number];
        },
        getLineColor: [255, 255, 255, 150],
        getLineWidth: 1,
        onClick: handlePointClick,
        onHover: handlePointHover,
        updateTriggers: {
          getRadius: [hoveredId],
          getFillColor: [hoveredId],
        },
      })
    );
    
    return result;
  }, [globeDots, points, animationTime, hoveredId, handlePointClick, handlePointHover]);

  // Globe view configuration
  const views = useMemo(() => [
    new DeckGlobeView({
      id: 'globe',
      resolution: 10,
    }),
  ], []);

  return (
    <div className="relative w-full h-full bg-black">
      <DeckGL
        views={views}
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
        style={{ background: '#050505' }}
      />
      
      {/* Globe edge glow effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% 40%, transparent 40%, rgba(0,0,0,0.8) 70%, #050505 100%)',
        }}
      />
    </div>
  );
}
