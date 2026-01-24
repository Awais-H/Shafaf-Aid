'use client';

/**
 * Mapbox Globe View - Real explorable map
 * Uses react-map-gl for Next.js compatibility
 * Supports zoom from globe view to street level
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Map, { Source, Layer, useMap } from 'react-map-gl';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl';
import type { MapPoint } from '@/core/data/schema';
import type { CircleLayer } from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';

// ============================================================================
// Types
// ============================================================================

interface MapboxGlobeProps {
  points: MapPoint[];
  onPointClick?: (point: MapPoint) => void;
  introComplete?: boolean;
  onIntroComplete?: () => void;
  autoRotate?: boolean;
}

// ============================================================================
// Mapbox Token
// ============================================================================

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiYW1hYW4zMCIsImEiOiJjbWtzc2pjcmQxa25vM2VteGMwYzNoN3h4In0.-3gzOU2QWGlFeLIWr1g6gw';

// ============================================================================
// Layer Styles
// ============================================================================

const glowLayerStyle: CircleLayer = {
  id: 'marker-glow',
  type: 'circle',
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      1, 25,
      5, 35,
      10, 45,
    ],
    'circle-color': [
      'interpolate',
      ['linear'],
      ['get', 'normalizedValue'],
      0, 'rgba(220, 53, 69, 0.25)',
      0.5, 'rgba(255, 193, 7, 0.25)',
      1, 'rgba(40, 167, 69, 0.25)',
    ],
    'circle-blur': 1,
  },
};

const markerLayerStyle: CircleLayer = {
  id: 'markers',
  type: 'circle',
  paint: {
    'circle-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      1, 8,
      5, 12,
      10, 16,
    ],
    'circle-color': [
      'interpolate',
      ['linear'],
      ['get', 'normalizedValue'],
      0, '#dc3545',
      0.5, '#ffc107',
      1, '#28a745',
    ],
    'circle-stroke-width': 2,
    'circle-stroke-color': 'rgba(255, 255, 255, 0.6)',
  },
};

// ============================================================================
// Component
// ============================================================================

export default function MapboxGlobe({
  points,
  onPointClick,
  introComplete = false,
  onIntroComplete,
  autoRotate = true,
}: MapboxGlobeProps) {
  const mapRef = useRef<MapRef>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: 20,
    latitude: 15,
    zoom: 1.5,
  });
  const rotationRef = useRef<number | null>(null);

  // Convert points to GeoJSON
  const geojsonData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: points.map(point => ({
      type: 'Feature',
      properties: {
        id: point.id,
        name: point.name,
        value: point.value,
        normalizedValue: point.normalizedValue,
      },
      geometry: {
        type: 'Point',
        coordinates: point.coordinates,
      },
    })),
  };

  // Handle view state change
  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  // Handle user interaction
  const handleInteractionStart = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onIntroComplete?.();
    }
    // Stop rotation
    if (rotationRef.current) {
      cancelAnimationFrame(rotationRef.current);
      rotationRef.current = null;
    }
  }, [hasInteracted, onIntroComplete]);

  // Handle marker click
  const handleClick = useCallback((event: any) => {
    const features = event.features;
    if (features && features.length > 0) {
      const clickedFeature = features[0];
      const point = points.find(p => p.id === clickedFeature.properties?.id);
      if (point && onPointClick) {
        onPointClick(point);
      }
    }
  }, [points, onPointClick]);

  // Auto rotation effect
  useEffect(() => {
    if (hasInteracted || introComplete || !autoRotate) {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
        rotationRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();

    const rotate = (timestamp: number) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      setViewState(prev => ({
        ...prev,
        longitude: prev.longitude + delta * 0.003,
      }));

      rotationRef.current = requestAnimationFrame(rotate);
    };

    rotationRef.current = requestAnimationFrame(rotate);

    return () => {
      if (rotationRef.current) {
        cancelAnimationFrame(rotationRef.current);
        rotationRef.current = null;
      }
    };
  }, [hasInteracted, introComplete, autoRotate]);

  return (
    <div className="relative w-full h-full" style={{ background: '#050505' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onDragStart={handleInteractionStart}
        onZoomStart={handleInteractionStart}
        onClick={handleClick}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        projection={{ name: 'globe' }}
        fog={{
          color: 'rgba(10, 10, 10, 1)',
          'high-color': 'rgba(15, 15, 20, 1)',
          'horizon-blend': 0.1,
          'space-color': 'rgba(5, 5, 5, 1)',
          'star-intensity': 0.15,
        }}
        interactiveLayerIds={['markers']}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        cursor="grab"
      >
        <Source id="markers-source" type="geojson" data={geojsonData}>
          <Layer {...glowLayerStyle} />
          <Layer {...markerLayerStyle} />
        </Source>
      </Map>

      {/* Atmospheric glow overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,5,5,0.4) 80%, rgba(5,5,5,0.9) 100%)',
        }}
      />
    </div>
  );
}
