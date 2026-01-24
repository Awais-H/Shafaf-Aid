/**
 * Map Utilities
 * Color scales, coordinate helpers, and map configuration.
 */

// Coverage Index color scale (red → yellow → green)
// Lower coverage = red (needs attention), Higher = green (well covered)
export function getCoverageColor(normalizedValue: number): string {
    // Clamp to 0-1
    const v = Math.max(0, Math.min(1, normalizedValue));

    if (v < 0.33) {
        // Red to Yellow
        const t = v / 0.33;
        return `rgb(${239}, ${Math.round(68 + t * (187 - 68))}, ${Math.round(68 + t * (36 - 68))})`;
    } else if (v < 0.66) {
        // Yellow to Green
        const t = (v - 0.33) / 0.33;
        return `rgb(${Math.round(251 - t * (251 - 16))}, ${Math.round(191 - t * (191 - 185))}, ${Math.round(36 + t * (129 - 36))})`;
    } else {
        // Green
        return `rgb(16, 185, 129)`;
    }
}

// Get color for Mapbox fill expression
export function getCoverageColorExpression(): mapboxgl.Expression {
    return [
        'interpolate',
        ['linear'],
        ['get', 'coverageIndexNorm'],
        0, '#ef4444',      // Red (low coverage)
        0.33, '#fbbf24',   // Yellow
        0.66, '#10b981',   // Green (high coverage)
        1, '#10b981'
    ];
}

// Default map center (Middle East/Horn of Africa focus)
export const MAP_CENTER: [number, number] = [45.0, 20.0];

// Default zoom levels
export const ZOOM_WORLD = 2.5;
export const ZOOM_COUNTRY = 5.5;

// Country centroids for fly-to navigation
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
    syria: [38.99, 35.0],
    yemen: [48.5, 15.5],
    sudan: [30.0, 15.0],
    afghanistan: [67.0, 33.0],
    somalia: [46.0, 5.0],
    palestine: [35.2, 31.9],
    myanmar: [96.0, 21.0],
    ethiopia: [40.0, 9.0],
};

// Get centroid for a country
export function getCountryCentroid(countryId: string): [number, number] {
    return COUNTRY_CENTROIDS[countryId] || MAP_CENTER;
}

// Format population for display
export function formatPopulation(pop: number): string {
    if (pop >= 1_000_000) {
        return `${(pop / 1_000_000).toFixed(1)}M`;
    } else if (pop >= 1_000) {
        return `${(pop / 1_000).toFixed(0)}K`;
    }
    return pop.toString();
}

// Format coverage index for display
export function formatCoverage(value: number): string {
    return `${(value * 100).toFixed(0)}%`;
}
