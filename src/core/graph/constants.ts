/**
 * AidGap Graph Constants
 * Weights and helper functions for metric calculations.
 */

import type { AidType } from '../data/schema';

// Aid type weights (heuristic, clearly labeled as such)
export const AID_TYPE_WEIGHTS: Record<AidType, number> = {
    food: 1.0,
    medical: 1.2,
    infrastructure: 0.8,
};

// Need level to numeric factor mapping
export const NEED_LEVEL_FACTORS: Record<string, number> = {
    low: 0.8,
    medium: 1.0,
    high: 1.3,
};

// Valid aid types for validation
export const VALID_AID_TYPES: Set<string> = new Set(['food', 'medical', 'infrastructure']);

/**
 * Get weight for an aid type
 */
export function getAidTypeWeight(aidType: AidType): number {
    return AID_TYPE_WEIGHTS[aidType];
}

/**
 * Convert need_level string to numeric factor
 */
export function getNeedFactor(needLevel: string | undefined, needFactor: number | undefined): number {
    if (needFactor !== undefined && needFactor > 0) {
        return needFactor;
    }
    if (needLevel && needLevel in NEED_LEVEL_FACTORS) {
        return NEED_LEVEL_FACTORS[needLevel];
    }
    return 1.0; // default to medium
}

/**
 * Check if aid type is valid
 */
export function isValidAidType(aidType: string): aidType is AidType {
    return VALID_AID_TYPES.has(aidType);
}

/**
 * Min-max normalization to [0, 1]
 * If max === min, returns 0.5 for all values
 */
export function normalizeMinMax(values: number[]): number[] {
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (max === min) {
        return values.map(() => 0.5);
    }

    return values.map(v => (v - min) / (max - min));
}
