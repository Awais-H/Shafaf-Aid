/**
 * Sanity checks and safety utilities for AidGap
 * Prevents divide-by-zero, clamps extreme values, and validates data
 */

import type { AppData, Region, Country, Organization, AidEdge } from '../data/schema';

// ============================================================================
// Numeric Safety
// ============================================================================

/**
 * Safe division that returns 0 for divide-by-zero cases
 */
export function safeDiv(numerator: number, denominator: number, fallback: number = 0): number {
  if (denominator === 0 || !isFinite(denominator)) {
    return fallback;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
}

/**
 * Clamps a value to a range
 */
export function clamp(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

/**
 * Asserts that a number is valid (not NaN or Infinity)
 * Returns a fallback value if invalid
 */
export function assertValidNumber(value: number, fallback: number = 0): number {
  if (!isFinite(value) || isNaN(value)) {
    console.warn(`Invalid number detected: ${value}, using fallback: ${fallback}`);
    return fallback;
  }
  return value;
}

// ============================================================================
// Data Validation
// ============================================================================

/**
 * Validates that all required fields are present on a region
 */
export function validateRegion(region: Partial<Region>): region is Region {
  return (
    typeof region.id === 'string' &&
    typeof region.countryId === 'string' &&
    typeof region.name === 'string' &&
    Array.isArray(region.centroid) &&
    region.centroid.length === 2 &&
    typeof region.population === 'number' &&
    region.population > 0 &&
    ['low', 'medium', 'high'].includes(region.needLevel as string)
  );
}

/**
 * Validates that all required fields are present on a country
 */
export function validateCountry(country: Partial<Country>): country is Country {
  return (
    typeof country.id === 'string' &&
    typeof country.name === 'string' &&
    typeof country.iso2 === 'string' &&
    typeof country.curated === 'boolean' &&
    Array.isArray(country.centroid) &&
    country.centroid.length === 2
  );
}

/**
 * Validates that all required fields are present on an organization
 */
export function validateOrganization(org: Partial<Organization>): org is Organization {
  return (
    typeof org.id === 'string' &&
    typeof org.name === 'string'
  );
}

/**
 * Validates that all required fields are present on an aid edge
 */
export function validateAidEdge(edge: Partial<AidEdge>): edge is AidEdge {
  return (
    typeof edge.id === 'string' &&
    typeof edge.orgId === 'string' &&
    typeof edge.regionId === 'string' &&
    ['food', 'medical', 'infrastructure'].includes(edge.aidType as string) &&
    typeof edge.projectCount === 'number' &&
    edge.projectCount >= 0 &&
    typeof edge.isSynthetic === 'boolean'
  );
}

// ============================================================================
// Data Integrity Checks
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the entire app data for consistency
 */
export function validateAppData(data: AppData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check countries
  const countryIds = new Set<string>();
  for (const country of data.countries) {
    if (!validateCountry(country)) {
      errors.push(`Invalid country: ${JSON.stringify(country)}`);
    } else {
      countryIds.add(country.id);
    }
  }

  // Check regions
  const regionIds = new Set<string>();
  for (const region of data.regions) {
    if (!validateRegion(region)) {
      errors.push(`Invalid region: ${JSON.stringify(region)}`);
    } else {
      regionIds.add(region.id);
      if (!countryIds.has(region.countryId)) {
        errors.push(`Region ${region.id} references non-existent country: ${region.countryId}`);
      }
    }
  }

  // Check organizations
  const orgIds = new Set<string>();
  for (const org of data.organizations) {
    if (!validateOrganization(org)) {
      errors.push(`Invalid organization: ${JSON.stringify(org)}`);
    } else {
      orgIds.add(org.id);
    }
  }

  // Check aid edges
  for (const edge of data.aidEdges) {
    if (!validateAidEdge(edge)) {
      errors.push(`Invalid aid edge: ${JSON.stringify(edge)}`);
    } else {
      if (!orgIds.has(edge.orgId)) {
        errors.push(`Aid edge ${edge.id} references non-existent org: ${edge.orgId}`);
      }
      if (!regionIds.has(edge.regionId)) {
        errors.push(`Aid edge ${edge.id} references non-existent region: ${edge.regionId}`);
      }
    }
  }

  // Warnings for potential issues
  if (data.countries.length === 0) {
    warnings.push('No countries in data');
  }
  if (data.regions.length === 0) {
    warnings.push('No regions in data');
  }
  if (data.organizations.length === 0) {
    warnings.push('No organizations in data');
  }
  if (data.aidEdges.length === 0) {
    warnings.push('No aid edges in data');
  }

  // Check for regions without any aid edges
  const regionsWithEdges = new Set(data.aidEdges.map(e => e.regionId));
  for (const region of data.regions) {
    if (!regionsWithEdges.has(region.id)) {
      warnings.push(`Region ${region.name} (${region.id}) has no aid edges`);
    }
  }

  // Check for orgs without any aid edges
  const orgsWithEdges = new Set(data.aidEdges.map(e => e.orgId));
  for (const org of data.organizations) {
    if (!orgsWithEdges.has(org.id)) {
      warnings.push(`Organization ${org.name} (${org.id}) has no aid edges`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Demo Safety
// ============================================================================

/**
 * Ensures data is safe for demo (no extreme values, all fields present)
 */
export function sanitizeForDemo(data: AppData): AppData {
  // Filter out invalid entries
  const countries = data.countries.filter(validateCountry);
  const regions = data.regions.filter(validateRegion);
  const organizations = data.organizations.filter(validateOrganization);

  // Build valid ID sets
  const validCountryIds = new Set(countries.map(c => c.id));
  const validRegionIds = new Set(regions.map(r => r.id));
  const validOrgIds = new Set(organizations.map(o => o.id));

  // Filter regions to only those with valid countries
  const validRegions = regions.filter(r => validCountryIds.has(r.countryId));
  const finalRegionIds = new Set(validRegions.map(r => r.id));

  // Filter edges to only those with valid orgs and regions
  const aidEdges = data.aidEdges
    .filter(validateAidEdge)
    .filter(e => validOrgIds.has(e.orgId) && finalRegionIds.has(e.regionId));

  return {
    countries,
    regions: validRegions,
    organizations,
    aidEdges,
  };
}

// ============================================================================
// Strict Sanity Checks (Throws Errors)
// ============================================================================

const VALID_AID_TYPES = ['food', 'medical', 'infrastructure'] as const;

/**
 * Runs strict sanity checks that throw errors for invalid data
 * Use this in development/testing to catch data issues early
 */
export function runSanityChecks(data: AppData): void {
  const countryIds = new Set<string>();
  const regionIds = new Set<string>();
  const orgIds = new Set<string>();

  // Validate countries
  for (const country of data.countries) {
    if (!country.id || typeof country.id !== 'string') {
      throw new Error(`Invalid country: missing or invalid id - ${JSON.stringify(country)}`);
    }
    if (!country.name || typeof country.name !== 'string') {
      throw new Error(`Invalid country ${country.id}: missing or invalid name`);
    }
    countryIds.add(country.id);
  }

  // Validate regions
  for (const region of data.regions) {
    if (!region.id || typeof region.id !== 'string') {
      throw new Error(`Invalid region: missing or invalid id - ${JSON.stringify(region)}`);
    }
    if (!region.countryId || !countryIds.has(region.countryId)) {
      throw new Error(`Region ${region.id}: references non-existent country ${region.countryId}`);
    }
    if (typeof region.population !== 'number' || region.population <= 0) {
      throw new Error(`Region ${region.id}: population must be > 0, got ${region.population}`);
    }
    if (!['low', 'medium', 'high'].includes(region.needLevel)) {
      throw new Error(`Region ${region.id}: invalid needLevel ${region.needLevel}`);
    }
    regionIds.add(region.id);
  }

  // Validate organizations
  for (const org of data.organizations) {
    if (!org.id || typeof org.id !== 'string') {
      throw new Error(`Invalid organization: missing or invalid id - ${JSON.stringify(org)}`);
    }
    if (!org.name || typeof org.name !== 'string') {
      throw new Error(`Invalid organization ${org.id}: missing or invalid name`);
    }
    orgIds.add(org.id);
  }

  // Validate aid edges
  for (const edge of data.aidEdges) {
    if (!edge.id || typeof edge.id !== 'string') {
      throw new Error(`Invalid aid edge: missing or invalid id - ${JSON.stringify(edge)}`);
    }
    if (!edge.orgId || !orgIds.has(edge.orgId)) {
      throw new Error(`Aid edge ${edge.id}: references non-existent org ${edge.orgId}`);
    }
    if (!edge.regionId || !regionIds.has(edge.regionId)) {
      throw new Error(`Aid edge ${edge.id}: references non-existent region ${edge.regionId}`);
    }
    if (!VALID_AID_TYPES.includes(edge.aidType as typeof VALID_AID_TYPES[number])) {
      throw new Error(`Aid edge ${edge.id}: unknown aid_type "${edge.aidType}". Must be one of: ${VALID_AID_TYPES.join(', ')}`);
    }
    if (typeof edge.projectCount !== 'number' || edge.projectCount < 0) {
      throw new Error(`Aid edge ${edge.id}: projectCount must be >= 0, got ${edge.projectCount}`);
    }
  }
}
