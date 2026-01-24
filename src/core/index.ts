/**
 * AidGap Core Engine - Public API
 * 
 * This is the main entry point for the core analytics engine.
 * Other team members should import from here.
 * 
 * @example
 * ```typescript
 * import { 
 *   loadAidGapData, runSanityChecks,
 *   computeCountryScores, computeRegionScores,
 *   getCoverageVariance, getCountryAidPresence,
 *   getTopOrgs, getAidTypeBreakdown,
 *   getOrgRegions, getRegionOrgs, getOverlapRegions
 * } from './core';
 * 
 * const data = loadAidGapData();
 * runSanityChecks(data);
 * 
 * // Heatmaps
 * const countryScores = computeCountryScores(data);
 * const regionScores = computeRegionScores(data, 'syria');
 * 
 * // Variance (PRD: Coverage Variance)
 * const variance = getCoverageVariance(data, 'syria');
 * 
 * // Bipartite queries (PRD: Org ↔ Region)
 * const wfpRegions = getOrgRegions(data, 'wfp');
 * const aleppoOrgs = getRegionOrgs(data, 'syria-aleppo');
 * ```
 */

// Data loading
export { loadAidGapData } from './data/loadData';

// Sanity checks
export { runSanityChecks, ValidationError } from './graph/sanityChecks';

// Metrics (PRD: Coverage Index + Variance)
export {
    computeCountryScores,
    computeRegionScores,
    getCoverageVariance,
    getCountryAidPresence,
} from './graph/metrics';

// Rankings
export { getTopOrgs, getAidTypeBreakdown } from './graph/ranking';

// Bipartite graph operations (PRD: Org ↔ Region queries)
export { getOrgRegions, getRegionOrgs, getOverlapRegions } from './graph/bipartite';

// Types (re-export for consumers)
export type {
    AidGapData,
    CountryScore,
    RegionScore,
    OrgStat,
    AidTypeStat,
    AidType,
    Country,
    Region,
    Org,
    NormalizedEdge,
    AidGapGraph,
    CoverageVariance,
    SpreadLevel,
    OrgRegionEdge,
    RegionOrgEdge,
} from './data/schema';

