'use client';

/**
 * Main map view component for Shafaf
 * Integrates MapLibre GL JS with deck.gl for visualization
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Map from 'react-map-gl/maplibre';
import { DeckGL } from '@deck.gl/react';
import type { MapViewState, MapPoint } from '@/core/data/schema';
import { useViewStore } from '@/app_state/viewStore';
import { createAllPointLayers, createRegionPolygonLayer, PickingInfo } from './Layers';
import { getMapStyleUrl } from './MapUtils';
import { MAP_CONFIG } from '@/core/graph/constants';
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
    mosqueMode?: boolean;
    initialViewState?: MapViewState;
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
    mosqueMode = false,
    initialViewState,
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
        (info: { object?: MapPoint }) => {
            if (info.object && onPointClick) {
                onPointClick(info.object);
            }
        },
        [onPointClick]
    );

    // Handle point hover with slight delay for smooth effect
    const handlePointHover = useCallback((info: { object?: MapPoint; x: number; y: number }) => {
        // Clear any pending hover timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        if (info.object) {
            const point = info.object;
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
        (info: { object?: { properties?: { id?: string } } }) => {
            const regionId = info.object?.properties?.id;
            if (regionId && onRegionClick) {
                onRegionClick(regionId);
            }
        },
        [onRegionClick]
    );

    // Handle region hover (separate from point hover)
    const handleRegionHover = useCallback((info: PickingInfo<GeoJSON.Feature>) => {
        // We don't show tooltips for regions, just update hover state if needed
        // This is intentionally simpler than point hover
    }, []);

    // Use delayed hover ID for smooth highlight effect
    const hoveredId = delayedHoverId;

    // Build layers
    const layers = [];

    // Add region polygons if available (for country view)
    if (regionGeoJson) {
        layers.push(
            createRegionPolygonLayer({
                data: regionGeoJson,
                onFeatureClick: handleRegionClick as (info: PickingInfo<GeoJSON.Feature>) => void,
                onFeatureHover: handleRegionHover,
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
                <div
                    className="absolute pointer-events-none z-10 bg-gray-900/95 text-white px-3 py-2 rounded-lg shadow-lg text-sm"
                    style={{
                        left: hoverInfo.x + 10,
                        top: hoverInfo.y + 10,
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
