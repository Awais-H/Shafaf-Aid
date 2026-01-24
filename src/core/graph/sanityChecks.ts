/**
 * AidGap Sanity Checks
 * Validates data integrity and throws friendly errors.
 */

import type { AidGapData } from '../data/schema';
import { VALID_AID_TYPES } from './constants';

/**
 * Validation error with context
 */
export class ValidationError extends Error {
    constructor(message: string, public context: Record<string, unknown>) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * Run all sanity checks on loaded data.
 * Throws descriptive errors if validation fails.
 */
export function runSanityChecks(data: AidGapData): void {
    // Check countries
    for (const [countryId, country] of data.countriesById) {
        if (country.population <= 0) {
            throw new ValidationError(
                `Country has invalid population (must be > 0)`,
                { countryId, population: country.population }
            );
        }
        if (country.needFactor <= 0) {
            throw new ValidationError(
                `Country has invalid need factor (must be > 0)`,
                { countryId, needFactor: country.needFactor }
            );
        }
    }

    // Check regions
    for (const [regionId, region] of data.regionsById) {
        if (!data.countriesById.has(region.countryId)) {
            throw new ValidationError(
                `Region references non-existent country`,
                { regionId, countryId: region.countryId }
            );
        }
        if (region.population <= 0) {
            throw new ValidationError(
                `Region has invalid population (must be > 0)`,
                { regionId, population: region.population }
            );
        }
        if (region.needFactor <= 0) {
            throw new ValidationError(
                `Region has invalid need factor (must be > 0)`,
                { regionId, needFactor: region.needFactor }
            );
        }
    }

    // Check edges
    for (let i = 0; i < data.edges.length; i++) {
        const edge = data.edges[i];

        if (!data.orgsById.has(edge.orgId)) {
            throw new ValidationError(
                `Edge references non-existent organization`,
                { edgeIndex: i, orgId: edge.orgId }
            );
        }
        if (!data.regionsById.has(edge.regionId)) {
            throw new ValidationError(
                `Edge references non-existent region`,
                { edgeIndex: i, regionId: edge.regionId }
            );
        }
        if (!VALID_AID_TYPES.has(edge.aidType)) {
            throw new ValidationError(
                `Edge has invalid aid type (must be food, medical, or infrastructure)`,
                { edgeIndex: i, aidType: edge.aidType }
            );
        }
        if (edge.projectCount < 0) {
            throw new ValidationError(
                `Edge has invalid project count (must be >= 0)`,
                { edgeIndex: i, projectCount: edge.projectCount }
            );
        }
    }

    // Check graph integrity
    for (const [regionId] of data.graph.regionEdges) {
        if (!data.regionsById.has(regionId)) {
            throw new ValidationError(
                `Graph contains orphaned region edge`,
                { regionId }
            );
        }
    }

    // Verify country-region mapping
    for (const [countryId, regionIds] of data.graph.countryRegions) {
        if (!data.countriesById.has(countryId)) {
            throw new ValidationError(
                `Graph contains orphaned country in countryRegions`,
                { countryId }
            );
        }
        for (const regionId of regionIds) {
            if (!data.regionsById.has(regionId)) {
                throw new ValidationError(
                    `Graph countryRegions contains non-existent region`,
                    { countryId, regionId }
                );
            }
        }
    }
}
