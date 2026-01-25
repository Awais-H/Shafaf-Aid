/**
 * Data loading utilities for AidGap
 * Supports both static (JSON) and Supabase data sources
 */

import type {
  AppData,
  Country,
  Region,
  Organization,
  AidEdge,
  ViewportBounds,
} from './schema';
import { getSupabaseClient, getDataMode } from './supabaseClient';
import { sanitizeForDemo, validateAppData } from '../graph/sanityChecks';

// ============================================================================
// In-memory cache for viewport queries
// ============================================================================

interface CacheEntry {
  data: AppData;
  timestamp: number;
  bounds: ViewportBounds;
  zoom: number;
}

const viewportCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60000; // 1 minute cache

function getCacheKey(bounds: ViewportBounds, zoom: number): string {
  // Round to reduce cache fragmentation
  const precision = 2;
  return `${bounds.minLng.toFixed(precision)}_${bounds.minLat.toFixed(precision)}_${bounds.maxLng.toFixed(precision)}_${bounds.maxLat.toFixed(precision)}_${Math.floor(zoom)}`;
}

function getCachedData(bounds: ViewportBounds, zoom: number): AppData | null {
  const key = getCacheKey(bounds, zoom);
  const entry = viewportCache.get(key);
  
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL_MS) {
    viewportCache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCachedData(bounds: ViewportBounds, zoom: number, data: AppData): void {
  const key = getCacheKey(bounds, zoom);
  viewportCache.set(key, {
    data,
    timestamp: Date.now(),
    bounds,
    zoom,
  });
  
  // Limit cache size
  if (viewportCache.size > 50) {
    const oldestKey = viewportCache.keys().next().value;
    if (oldestKey) viewportCache.delete(oldestKey);
  }
}

// ============================================================================
// Static Data Loading
// ============================================================================

let staticDataCache: AppData | null = null;

/**
 * Loads static data from JSON files
 */
export async function loadStaticData(): Promise<AppData> {
  if (staticDataCache) {
    return staticDataCache;
  }

  try {
    // Import static JSON files
    const [countries, regions, organizations, aidEdges] = await Promise.all([
      import('@/data/countries.json').then(m => m.default as Country[]),
      import('@/data/regions.json').then(m => m.default as Region[]),
      import('@/data/orgs.json').then(m => m.default as Organization[]),
      import('@/data/aid_edges.json').then(m => m.default as AidEdge[]),
    ]);

    const data: AppData = {
      countries,
      regions,
      organizations,
      aidEdges,
    };

    // Validate and sanitize
    const validation = validateAppData(data);
    if (!validation.valid) {
      console.error('Data validation errors:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn('Data validation warnings:', validation.warnings);
    }

    staticDataCache = sanitizeForDemo(data);
    return staticDataCache;
  } catch (error) {
    console.error('Failed to load static data:', error);
    throw new Error('Failed to load static data. Check that JSON files exist in src/data/');
  }
}

// ============================================================================
// Supabase Data Loading
// ============================================================================

/**
 * Loads all data from Supabase
 */
export async function loadSupabaseData(): Promise<AppData> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not configured');
  }

  try {
    const [
      { data: countries, error: countriesError },
      { data: regions, error: regionsError },
      { data: organizations, error: orgsError },
      { data: aidEdges, error: edgesError },
    ] = await Promise.all([
      client.from('countries').select('*'),
      client.from('regions').select('*'),
      client.from('orgs').select('*'),
      client.from('aid_edges').select('*'),
    ]);

    if (countriesError) throw countriesError;
    if (regionsError) throw regionsError;
    if (orgsError) throw orgsError;
    if (edgesError) throw edgesError;

    // Transform Supabase records to app schema
    const data: AppData = {
      countries: (countries || []).map(c => ({
        id: c.id,
        name: c.name,
        iso2: c.iso2,
        curated: c.curated,
        centroid: [c.centroid_lng || 0, c.centroid_lat || 0] as [number, number],
      })),
      regions: (regions || []).map(r => ({
        id: r.id,
        countryId: r.country_id,
        name: r.name,
        centroid: [r.centroid_lng || 0, r.centroid_lat || 0] as [number, number],
        population: r.population,
        needLevel: r.need_level,
      })),
      organizations: (organizations || []).map(o => ({
        id: o.id,
        name: o.name,
        type: o.type,
        website_url: o.website_url,
      })),
      aidEdges: (aidEdges || []).map(e => ({
        id: e.id,
        orgId: e.org_id,
        regionId: e.region_id,
        aidType: e.aid_type,
        projectCount: e.project_count,
        isSynthetic: e.is_synthetic,
        source: e.source,
      })),
    };

    return sanitizeForDemo(data);
  } catch (error) {
    console.error('Failed to load Supabase data:', error);
    throw new Error('Failed to load data from Supabase');
  }
}

/**
 * Loads data within viewport bounds from Supabase
 */
export async function loadSupabaseDataByViewport(
  bounds: ViewportBounds,
  zoom: number
): Promise<AppData> {
  // Check cache first
  const cached = getCachedData(bounds, zoom);
  if (cached) return cached;

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not configured');
  }

  try {
    // Query regions within bounds
    const { data: regions, error: regionsError } = await client
      .from('regions')
      .select('*')
      .gte('centroid_lng', bounds.minLng)
      .lte('centroid_lng', bounds.maxLng)
      .gte('centroid_lat', bounds.minLat)
      .lte('centroid_lat', bounds.maxLat);

    if (regionsError) throw regionsError;

    const regionIds = (regions || []).map(r => r.id);
    const countryIds = [...new Set((regions || []).map(r => r.country_id))];

    // Fetch related data
    const [
      { data: countries, error: countriesError },
      { data: aidEdges, error: edgesError },
    ] = await Promise.all([
      client.from('countries').select('*').in('id', countryIds),
      client.from('aid_edges').select('*').in('region_id', regionIds),
    ]);

    if (countriesError) throw countriesError;
    if (edgesError) throw edgesError;

    const orgIds = [...new Set((aidEdges || []).map(e => e.org_id))];
    const { data: organizations, error: orgsError } = await client
      .from('orgs')
      .select('*')
      .in('id', orgIds);

    if (orgsError) throw orgsError;

    // Transform to app schema
    const data: AppData = {
      countries: (countries || []).map(c => ({
        id: c.id,
        name: c.name,
        iso2: c.iso2,
        curated: c.curated,
        centroid: [c.centroid_lng || 0, c.centroid_lat || 0] as [number, number],
      })),
      regions: (regions || []).map(r => ({
        id: r.id,
        countryId: r.country_id,
        name: r.name,
        centroid: [r.centroid_lng || 0, r.centroid_lat || 0] as [number, number],
        population: r.population,
        needLevel: r.need_level,
      })),
      organizations: (organizations || []).map(o => ({
        id: o.id,
        name: o.name,
        type: o.type,
        website_url: o.website_url,
      })),
      aidEdges: (aidEdges || []).map(e => ({
        id: e.id,
        orgId: e.org_id,
        regionId: e.region_id,
        aidType: e.aid_type,
        projectCount: e.project_count,
        isSynthetic: e.is_synthetic,
        source: e.source,
      })),
    };

    const sanitized = sanitizeForDemo(data);
    setCachedData(bounds, zoom, sanitized);
    return sanitized;
  } catch (error) {
    console.error('Failed to load Supabase data by viewport:', error);
    throw new Error('Failed to load viewport data from Supabase');
  }
}

// ============================================================================
// Unified Data Loading
// ============================================================================

/**
 * Loads data based on current data mode
 */
export async function loadAppData(): Promise<AppData> {
  const mode = getDataMode();
  
  if (mode === 'supabase') {
    return loadSupabaseData();
  }
  
  return loadStaticData();
}

/**
 * Loads data for a specific country
 */
export async function loadCountryData(countryId: string): Promise<AppData> {
  const allData = await loadAppData();
  
  // Filter to only this country's data
  const regions = allData.regions.filter(r => r.countryId === countryId);
  const regionIds = new Set(regions.map(r => r.id));
  const aidEdges = allData.aidEdges.filter(e => regionIds.has(e.regionId));
  const orgIds = new Set(aidEdges.map(e => e.orgId));
  const organizations = allData.organizations.filter(o => orgIds.has(o.id));
  const countries = allData.countries.filter(c => c.id === countryId);
  
  return {
    countries,
    regions,
    organizations,
    aidEdges,
  };
}

/**
 * Clears all caches (useful for data refresh)
 */
export function clearDataCache(): void {
  staticDataCache = null;
  viewportCache.clear();
}
