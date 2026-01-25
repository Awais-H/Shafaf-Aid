'use client';

/**
 * Mapbox Globe View - Real explorable map
 * Uses react-map-gl for Next.js compatibility
 * Supports zoom from globe view to street level
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import type { MapRef, ViewStateChangeEvent, MapLayerMouseEvent } from 'react-map-gl';
import type { Map as MapboxMap } from 'mapbox-gl';
import type { MapPoint } from '@/core/data/schema';

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

// Layer styles (cast as any to handle Mapbox expression types)
const glowLayerStyle: any = {
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

const markerLayerStyle: any = {
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
  
  // Country hover state - track hovered country name
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle country hover - show native Mapbox labels on hover
  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Only show country names at low zoom (country level)
    if (viewState.zoom < 5) {
      // Query our invisible country fill layer
      const features = map.queryRenderedFeatures(event.point, {
        layers: ['country-fills']
      });

      if (features && features.length > 0) {
        const countryFeature = features[0];
        const name = countryFeature.properties?.name_en || countryFeature.properties?.name;
        
        if (name && name !== hoveredCountry) {
          // Clear any pending timeout
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          
          // Show instantly - no delay
          setHoveredCountry(name);
          updateCountryLabelVisibility(map, name);
        }
        return;
      }
    }

    // No country under mouse - hide with slight delay
    if (hoveredCountry) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredCountry(null);
        const map = mapRef.current?.getMap();
        if (map) {
          updateCountryLabelVisibility(map, null);
        }
      }, 40); // 40ms delay before hiding
    }
  }, [viewState.zoom, hoveredCountry]);

  // Update country label visibility based on hover
  const updateCountryLabelVisibility = useCallback((map: MapboxMap, countryName: string | null) => {
    const style = map.getStyle();
    if (!style?.layers) return;

    style.layers.forEach((layer) => {
      const layerId = layer.id.toLowerCase();
      
      // Find country label layers
      if (layerId.includes('country') && layerId.includes('label')) {
        if (countryName) {
          // Show only the hovered country's label
          map.setFilter(layer.id, ['==', ['get', 'name_en'], countryName]);
          map.setLayoutProperty(layer.id, 'visibility', 'visible');
          // Move label layer to top so it's above markers
          map.moveLayer(layer.id);
        } else {
          // Hide all country labels
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
    });
  }, []);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  // Hide country labels initially - they'll show on hover
  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Wait for style to load
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => onMapLoad());
      return;
    }

    // Add invisible country fill layer for hover detection
    // This uses the same source as admin boundaries
    if (!map.getLayer('country-fills')) {
      map.addSource('country-boundaries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
      });

      map.addLayer({
        id: 'country-fills',
        type: 'fill',
        source: 'country-boundaries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': 'transparent',
          'fill-opacity': 0
        }
      }, 'country-label'); // Add below country labels
    }

    // Hide country labels - they'll show on hover instead
    const style = map.getStyle();
    if (style?.layers) {
      style.layers.forEach((layer) => {
        const layerId = layer.id.toLowerCase();
        
        // Hide country labels initially (they show on hover)
        if (layerId.includes('country') && layerId.includes('label')) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
        
        // Hide continent labels
        if (layerId.includes('continent')) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      });
    }
  }, []);

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
        onMouseMove={handleMouseMove}
        onLoad={onMapLoad}
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
        interactiveLayerIds={['markers', 'country-fills']}
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
