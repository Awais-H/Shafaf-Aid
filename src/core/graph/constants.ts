/**
 * Constants for Shafaf calculations
 * These weights and factors are used in the Coverage Index formula
 */

import type { AidType, NeedLevel } from '../data/schema';

// ============================================================================
// Aid Type Weights
// ============================================================================
// Rationale: Different aid types have varying impact on coverage assessment
// - Medical aid is weighted higher due to critical nature
// - Infrastructure is weighted lower as it's often longer-term
// - Food aid is the baseline

export const AID_TYPE_WEIGHTS: Record<AidType, number> = {
  food: 1.0,
  medical: 1.2,
  infrastructure: 0.8,
} as const;

// ============================================================================
// Need Factor Multipliers
// ============================================================================
// Rationale: Higher need increases the denominator, making the same aid
// presence result in a lower coverage index (indicating more aid is needed)

export const NEED_FACTORS: Record<NeedLevel, number> = {
  low: 0.8,
  medium: 1.0,
  high: 1.3,
} as const;

// ============================================================================
// Normalization Constants
// ============================================================================

export const NORMALIZATION = {
  // Minimum population to prevent extreme values
  MIN_POPULATION: 1000,
  // Maximum coverage index before clamping (raw)
  MAX_COVERAGE_INDEX: 10,
  // Minimum coverage index (prevent negatives)
  MIN_COVERAGE_INDEX: 0,
  // Percentile for outlier clamping during normalization
  OUTLIER_PERCENTILE: 95,
} as const;

// ============================================================================
// Display Constants
// ============================================================================

export const DISPLAY = {
  // Top-k items for lists
  TOP_K_ORGS: 10,
  TOP_K_REGIONS: 20,
  // Decimal places for display
  DECIMAL_PLACES: 3,
  // Percentage decimal places
  PERCENTAGE_DECIMALS: 1,
} as const;

// ============================================================================
// Color Scales
// ============================================================================
// Coverage mismatch colors (red = high gap/low coverage, green = well covered)

export const COVERAGE_COLORS = {
  // RGB arrays for deck.gl
  HIGH_GAP: [220, 53, 69] as [number, number, number],      // Red - low coverage / high gap
  MEDIUM_GAP: [255, 193, 7] as [number, number, number],    // Yellow - medium coverage
  LOW_GAP: [40, 167, 69] as [number, number, number],       // Green - high coverage / low gap
  NEUTRAL: [108, 117, 125] as [number, number, number],     // Gray - no data
} as const;

// ============================================================================
// Map Constants
// ============================================================================

export const MAP_CONFIG = {
  // Default map style (dark basemap)
  DEFAULT_STYLE: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  // Initial view state
  INITIAL_VIEW: {
    longitude: 20,
    latitude: 10,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  },
  // Zoom levels
  WORLD_ZOOM: 2,
  COUNTRY_ZOOM: 5,
  REGION_ZOOM: 7,
  // Animation
  PULSE_SPEED: 0.002,
  GLOW_INTENSITY: 0.6,
} as const;

// ============================================================================
// Curated Countries
// ============================================================================
// These are the 5 countries highlighted in the demo

export const CURATED_COUNTRIES = [
  'somalia',
  'bangladesh',
  'yemen',
  'south_sudan',
  'afghanistan',
  'xinjiang',
  'palestine',
  'sudan',
  'kashmir',
] as const;

export type CuratedCountry = typeof CURATED_COUNTRIES[number];

// ============================================================================
// Formula Documentation
// ============================================================================

export const FORMULAS = {
  COVERAGE_INDEX: {
    name: 'Coverage Index',
    formula: 'Coverage Index = (Σ Weighted Aid Presence) / (Population × Need Factor)',
    description: 'Measures relative aid coverage normalized by population and need. Lower values indicate potential gaps.',
    components: [
      {
        name: 'Weighted Aid Presence',
        formula: 'Σ (Aid Type Weight × Project Count)',
        description: 'Sum of all aid projects weighted by type',
      },
      {
        name: 'Population',
        formula: 'Region Population (thousands)',
        description: 'Total population of the region',
      },
      {
        name: 'Need Factor',
        formula: 'Low=0.8, Medium=1.0, High=1.3',
        description: 'Multiplier based on assessed humanitarian need level',
      },
    ],
  },
  NORMALIZATION: {
    name: 'View-based Normalization',
    formula: 'Normalized = (Raw - Min) / (Max - Min)',
    description: 'All coverage values are normalized within the current view (world/country) for relative comparison.',
  },
  OVERLAP_INTENSITY: {
    name: 'Overlap Intensity',
    formula: 'Degree Centrality = Number of Orgs / Max Possible Connections',
    description: 'Measures how many organizations operate in a region relative to total organizations.',
  },
} as const;
