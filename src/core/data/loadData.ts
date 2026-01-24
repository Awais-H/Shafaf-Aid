/**
 * AidGap Data Loader
 * Loads JSON files and builds the complete AidGapData structure.
 */

import type {
    AidGapData,
    RawCountry,
    RawRegion,
    RawOrg,
    RawAidEdge,
    Country,
    Region,
    Org
} from './schema';
import { getNeedFactor } from '../graph/constants';
import { buildGraph } from '../graph/buildGraph';

// Import JSON data
import rawCountries from '../../data/countries.json';
import rawRegions from '../../data/regions.json';
import rawOrgs from '../../data/orgs.json';
import rawEdges from '../../data/aid_edges.json';

/**
 * Normalize a raw country to internal format
 */
function normalizeCountry(raw: RawCountry): Country {
    return {
        id: raw.id,
        name: raw.name,
        population: raw.population,
        needFactor: getNeedFactor(raw.need_level, raw.need_factor),
    };
}

/**
 * Normalize a raw region to internal format
 */
function normalizeRegion(raw: RawRegion): Region {
    return {
        id: raw.id,
        countryId: raw.country_id,
        name: raw.name,
        population: raw.population,
        needFactor: getNeedFactor(raw.need_level, raw.need_factor),
    };
}

/**
 * Normalize a raw org to internal format
 */
function normalizeOrg(raw: RawOrg): Org {
    return {
        id: raw.id,
        name: raw.name,
    };
}

/**
 * Load and process all AidGap data.
 * 
 * This function:
 * 1. Loads raw JSON data
 * 2. Normalizes need_level to need_factor
 * 3. Builds lookup maps
 * 4. Constructs the graph structure
 * 
 * @returns Complete AidGapData ready for metric computation
 */
export function loadAidGapData(): AidGapData {
    // Build lookup maps
    const countriesById = new Map<string, Country>();
    for (const raw of rawCountries as RawCountry[]) {
        countriesById.set(raw.id, normalizeCountry(raw));
    }

    const regionsById = new Map<string, Region>();
    for (const raw of rawRegions as RawRegion[]) {
        regionsById.set(raw.id, normalizeRegion(raw));
    }

    const orgsById = new Map<string, Org>();
    for (const raw of rawOrgs as RawOrg[]) {
        orgsById.set(raw.id, normalizeOrg(raw));
    }

    // Build graph and normalize edges
    const { edges, graph } = buildGraph(rawEdges as RawAidEdge[], regionsById);

    return {
        countriesById,
        regionsById,
        orgsById,
        edges,
        graph,
    };
}
