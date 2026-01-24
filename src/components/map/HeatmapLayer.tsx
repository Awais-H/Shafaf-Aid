import { useEffect, useRef } from 'react';
import { useMap } from './MapView';
import type { CountryScore, RegionScore } from '../../core';

interface HeatmapLayerProps {
    data: CountryScore[] | RegionScore[];
    level: 'country' | 'region';
    onFeatureClick?: (featureId: string) => void;
}

// ISO 3166-1 alpha-3 codes for our countries
const COUNTRY_ISO_MAP: Record<string, string> = {
    'syria': 'SYR',
    'yemen': 'YEM',
    'sudan': 'SDN',
    'afghanistan': 'AFG',
    'somalia': 'SOM',
    'palestine': 'PSE',
    'myanmar': 'MMR',
    'ethiopia': 'ETH',
};

export default function HeatmapLayer({ data, level, onFeatureClick }: HeatmapLayerProps) {
    const map = useMap();
    const layersAdded = useRef(false);

    useEffect(() => {
        if (!map || layersAdded.current) return;

        // For country level, use Mapbox's built-in country boundaries
        if (level === 'country') {
            const sourceId = 'aidgap-countries';
            const fillLayerId = 'aidgap-country-fill';
            const lineLayerId = 'aidgap-country-line';
            const highlightLayerId = 'aidgap-country-highlight';

            // Build color expression based on our data
            const colorExpression: any[] = ['match', ['get', 'iso_3166_1_alpha_3']];

            for (const item of data as CountryScore[]) {
                const iso = COUNTRY_ISO_MAP[item.countryId];
                if (iso) {
                    // Map coverage to color (red → yellow → green)
                    const norm = item.coverageIndexNorm;
                    let color;
                    if (norm < 0.33) {
                        color = '#ef4444'; // Red
                    } else if (norm < 0.66) {
                        color = '#fbbf24'; // Yellow  
                    } else {
                        color = '#10b981'; // Green
                    }
                    colorExpression.push(iso, color);
                }
            }
            colorExpression.push('transparent'); // Default

            // Add source using mapbox-countries-v1
            if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                    type: 'vector',
                    url: 'mapbox://mapbox.country-boundaries-v1'
                });
            }

            // Add fill layer
            if (!map.getLayer(fillLayerId)) {
                map.addLayer({
                    id: fillLayerId,
                    type: 'fill',
                    source: sourceId,
                    'source-layer': 'country_boundaries',
                    paint: {
                        'fill-color': colorExpression as any,
                        'fill-opacity': 0.7
                    },
                    filter: ['in', 'iso_3166_1_alpha_3', ...Object.values(COUNTRY_ISO_MAP)]
                });
            }

            // Add outline layer
            if (!map.getLayer(lineLayerId)) {
                map.addLayer({
                    id: lineLayerId,
                    type: 'line',
                    source: sourceId,
                    'source-layer': 'country_boundaries',
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': 1.5,
                        'line-opacity': 0.8
                    },
                    filter: ['in', 'iso_3166_1_alpha_3', ...Object.values(COUNTRY_ISO_MAP)]
                });
            }

            // Add hover highlight
            if (!map.getLayer(highlightLayerId)) {
                map.addLayer({
                    id: highlightLayerId,
                    type: 'line',
                    source: sourceId,
                    'source-layer': 'country_boundaries',
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': 3,
                        'line-opacity': 1
                    },
                    filter: ['==', 'iso_3166_1_alpha_3', ''] // Empty initially
                });
            }

            // Hover effects
            map.on('mousemove', fillLayerId, (e) => {
                map.getCanvas().style.cursor = 'pointer';
                const iso = e.features?.[0]?.properties?.iso_3166_1_alpha_3;
                if (iso) {
                    map.setFilter(highlightLayerId, ['==', 'iso_3166_1_alpha_3', iso]);
                }
            });

            map.on('mouseleave', fillLayerId, () => {
                map.getCanvas().style.cursor = '';
                map.setFilter(highlightLayerId, ['==', 'iso_3166_1_alpha_3', '']);
            });

            // Click handler
            if (onFeatureClick) {
                map.on('click', fillLayerId, (e) => {
                    const iso = e.features?.[0]?.properties?.iso_3166_1_alpha_3;
                    // Reverse lookup
                    const countryId = Object.entries(COUNTRY_ISO_MAP).find(([_, v]) => v === iso)?.[0];
                    if (countryId) {
                        onFeatureClick(countryId);
                    }
                });
            }

            layersAdded.current = true;
        }

        // For region level, we'd need admin-1 boundaries
        // For now, show a message that regions are in sidebar only
        if (level === 'region') {
            // Region boundaries require more complex data
            // The sidebar already shows the region list with coverage bars
            console.log('Region heatmap: See sidebar for region coverage details');
        }

        return () => {
            // Cleanup on unmount
        };
    }, [map, data, level, onFeatureClick]);

    return null;
}
