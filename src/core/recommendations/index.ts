/**
 * Aid Recommendation Engine
 * Deterministic, explainable allocation and coordination recommendations.
 * Uses existing coverage + simulation; no ML.
 */

import type { AppData, Region, AidType, NeedLevel } from '../data/schema';
import { getEdgesForRegion, getOrgsForRegion } from '../graph/buildGraph';
import { simulateAidAddition, calculateCoverageIndex, normalizeValues } from '../coverage';
import { CRISIS_SCENARIOS, type CrisisScenario } from '../graph/constants';

// ============================================================================
// Types
// ============================================================================

export interface UrgencyRankItem {
  regionId: string;
  regionName: string;
  countryId: string;
  countryName: string;
  urgencyScore: number;
  normalizedCoverage: number;
  rawCoverage: number;
  population: number;
  dynamicNeedFactor: number;
  volatility: number;
  populationWeight: number;
  volatilityWeight: number;
}

export interface DeploymentPlanItem {
  regionId: string;
  regionName: string;
  countryId: string;
  countryName: string;
  aidType: AidType;
  projects: number;
  coverageImprovement: number;
  rationale: string;
}

export interface CoordinationSuggestion {
  sourceRegionId: string;
  targetRegionId: string;
  sourceName: string;
  targetName: string;
  sourceCountryName: string;
  targetCountryName: string;
  aidType: AidType;
  projectCount: number;
  expectedCoverageGain: number;
  orgIds: string[];
  rationale: string;
}

export interface RecommendationEngineInput {
  data: AppData;
  scenario?: CrisisScenario;
  countryFilter?: string | null;
  aidTypeFilter?: AidType | null;
  maxPriorityRegions?: number;
}

export interface DeploymentPlanInput {
  data: AppData;
  availableBudget: number;
  scenario?: CrisisScenario;
  countryFilter?: string | null;
}

export interface CoordinationInput {
  data: AppData;
  scenario?: CrisisScenario;
}

// ============================================================================
// Helpers
// ============================================================================

function safeLog(x: number): number {
  return Math.log(Math.max(x, 1));
}

function getScenarioModifiers(scenario: CrisisScenario) {
  const s = CRISIS_SCENARIOS[scenario] ?? CRISIS_SCENARIOS.none;
  return {
    needFactorMultiplier: 1 + s.needFactorDelta,
    volatilityMultiplier: 1 + s.volatilityDelta,
    populationMultiplier: 1 + s.populationDelta,
  };
}

function buildRegionCoverageMap(data: AppData): Map<string, { raw: number; region: Region; edges: { aidType: AidType; projectCount: number }[] }> {
  const map = new Map<string, { raw: number; region: Region; edges: { aidType: AidType; projectCount: number }[] }>();
  const countryById = new Map(data.countries.map((c) => [c.id, c]));

  for (const region of data.regions) {
    const edges = getEdgesForRegion(region.id, data).map((e) => ({ aidType: e.aidType, projectCount: e.projectCount }));
    const result = calculateCoverageIndex({
      population: region.population,
      needLevel: region.needLevel,
      aidEdges: edges,
    });
    map.set(region.id, { raw: result.rawIndex, region, edges });
  }
  return map;
}

// ============================================================================
// 1. Priority Region Ranking (Urgency Score)
// ============================================================================

/**
 * Urgency Score = (1 − normalizedCoverage) × dynamicNeedFactor × populationWeight × volatilityWeight
 * populationWeight = log(population), volatilityWeight = 1 + volatility
 */
export function computeUrgencyRanking(input: RecommendationEngineInput): UrgencyRankItem[] {
  const { data, scenario = 'none', countryFilter, aidTypeFilter, maxPriorityRegions = 50 } = input;
  const mods = getScenarioModifiers(scenario);
  const covMap = buildRegionCoverageMap(data);
  const countryById = new Map(data.countries.map((c) => [c.id, c]));

  const rawValues = Array.from(covMap.values()).map((v) => v.raw);
  const normalized = normalizeValues(rawValues, { outlierPercentile: 95 });
  const regionIds = Array.from(covMap.keys());
  const normalizedByRegion = new Map<string, number>();
  regionIds.forEach((id, i) => normalizedByRegion.set(id, normalized[i] ?? 0.5));

  const items: UrgencyRankItem[] = [];

  for (let i = 0; i < regionIds.length; i++) {
    const regionId = regionIds[i];
    const entry = covMap.get(regionId)!;
    const { region, raw } = entry;
    const country = countryById.get(region.countryId);
    if (countryFilter && region.countryId !== countryFilter) continue;

    const normalizedCoverage = normalizedByRegion.get(regionId) ?? 0.5;
    const dynNeed = (region.dynamicNeedFactor ?? 1) * mods.needFactorMultiplier;
    const vol = (region.volatility ?? 0.5) * mods.volatilityMultiplier;
    const pop = region.population * mods.populationMultiplier;
    const populationWeight = safeLog(pop);
    const volatilityWeight = 1 + Math.min(vol, 1);

    const urgencyScore = (1 - normalizedCoverage) * dynNeed * populationWeight * volatilityWeight;

    items.push({
      regionId,
      regionName: region.name,
      countryId: region.countryId,
      countryName: country?.name ?? region.countryId,
      urgencyScore,
      normalizedCoverage,
      rawCoverage: raw,
      population: region.population,
      dynamicNeedFactor: dynNeed,
      volatility: region.volatility ?? 0.5,
      populationWeight,
      volatilityWeight,
    });
  }

  items.sort((a, b) => b.urgencyScore - a.urgencyScore);
  return items.slice(0, maxPriorityRegions);
}

// ============================================================================
// 2. Limited Resource Optimization (Greedy Allocation)
// ============================================================================

/**
 * Greedily allocate available project budget to (region, aidType) pairs
 * that yield the highest marginal coverage improvement, weighted by urgency.
 */
export function computeDeploymentPlan(input: DeploymentPlanInput): DeploymentPlanItem[] {
  const { data, availableBudget, scenario = 'none', countryFilter } = input;
  const covMap = buildRegionCoverageMap(data);
  const countryById = new Map(data.countries.map((c) => [c.id, c]));
  const ranking = computeUrgencyRanking({
    data,
    scenario,
    countryFilter,
    maxPriorityRegions: 200,
  });
  const urgencyByRegion = new Map(ranking.map((r) => [r.regionId, r.urgencyScore]));

  const AID_TYPES: AidType[] = ['food', 'medical', 'infrastructure'];
  const allocated = new Map<string, Record<AidType, number>>();

  function getAllocated(regionId: string, aidType: AidType): number {
    return allocated.get(regionId)?.[aidType] ?? 0;
  }

  function addAllocated(regionId: string, aidType: AidType, n: number): void {
    if (!allocated.has(regionId)) allocated.set(regionId, { food: 0, medical: 0, infrastructure: 0 });
    allocated.get(regionId)![aidType] += n;
  }

  const plan: DeploymentPlanItem[] = [];
  let remaining = availableBudget;

  while (remaining > 0) {
    let best: {
      regionId: string;
      aidType: AidType;
      delta: number;
      urgency: number;
      score: number;
    } | null = null;

    for (const entry of covMap.values()) {
      const { region, edges } = entry;
      if (countryFilter && region.countryId !== countryFilter) continue;

      const baseEdges = edges.map((e) => ({ aidType: e.aidType, projectCount: e.projectCount }));
      const allocatedEdges = AID_TYPES.flatMap((t) =>
        Array.from({ length: getAllocated(region.id, t) }, () => ({ aidType: t, projectCount: 1 }))
      );
      const combined = [...baseEdges, ...allocatedEdges];

      for (const aidType of AID_TYPES) {
        const simulated = simulateAidAddition({
          population: region.population,
          needLevel: region.needLevel,
          aidEdges: combined,
          additionalAid: 1,
          aidType,
        });
        const delta = simulated.delta;
        const urgency = urgencyByRegion.get(region.id) ?? 1;
        const score = delta * (0.5 + 0.5 * Math.min(urgency / 20, 1));

        if (score > 0 && (!best || score > best.score)) {
          best = { regionId: region.id, aidType, delta, urgency, score };
        }
      }
    }

    if (!best || best.delta <= 0) break;

    addAllocated(best.regionId, best.aidType, 1);
    remaining -= 1;

    const existing = plan.find((p) => p.regionId === best!.regionId && p.aidType === best!.aidType);
    if (existing) {
      existing.projects += 1;
      existing.coverageImprovement += best.delta;
    } else {
      const region = covMap.get(best.regionId)!.region;
      const country = countryById.get(region.countryId);
      plan.push({
        regionId: best.regionId,
        regionName: region.name,
        countryId: region.countryId,
        countryName: country?.name ?? region.countryId,
        aidType: best.aidType,
        projects: 1,
        coverageImprovement: best.delta,
        rationale: `High urgency (${(best.urgency).toFixed(1)}), marginal gain ${(best.delta * 100).toFixed(2)}%`,
      });
    }
  }

  plan.sort((a, b) => b.coverageImprovement - a.coverageImprovement);
  return plan;
}

// ============================================================================
// 3. Coordination & Redistribution Suggestions
// ============================================================================

/**
 * Detect high-overlap (source) and high-urgency low-coverage (target) regions;
 * suggest redirecting projects from source to target.
 */
export function computeCoordinationSuggestions(input: CoordinationInput): CoordinationSuggestion[] {
  const { data, scenario = 'none' } = input;
  const ranking = computeUrgencyRanking({ data, scenario, maxPriorityRegions: 200 });
  const urgencyByRegion = new Map(ranking.map((r) => [r.regionId, r.urgencyScore]));
  const covMap = buildRegionCoverageMap(data);
  const countryById = new Map(data.countries.map((c) => [c.id, c]));

  const orgCountByRegion = new Map<string, number>();
  const projectCountByRegion = new Map<string, number>();
  for (const r of data.regions) {
    const orgs = getOrgsForRegion(r.id, data);
    const edges = getEdgesForRegion(r.id, data);
    const projects = edges.reduce((s, e) => s + e.projectCount, 0);
    orgCountByRegion.set(r.id, orgs.length);
    projectCountByRegion.set(r.id, projects);
  }
  const maxOrgs = Math.max(...orgCountByRegion.values(), 1);
  const overlapByRegion = new Map<string, number>();
  orgCountByRegion.forEach((n, id) => overlapByRegion.set(id, n / maxOrgs));

  const sources: { regionId: string; overlap: number; normalizedCoverage: number }[] = [];
  const targets: { regionId: string; urgency: number; normalizedCoverage: number }[] = [];

  for (const r of ranking) {
    const overlap = overlapByRegion.get(r.regionId) ?? 0;
    if (overlap >= 0.5 && r.normalizedCoverage >= 0.35 && r.normalizedCoverage <= 0.7) {
      sources.push({ regionId: r.regionId, overlap, normalizedCoverage: r.normalizedCoverage });
    }
    if (r.urgencyScore >= 5 && r.normalizedCoverage < 0.35) {
      targets.push({ regionId: r.regionId, urgency: r.urgencyScore, normalizedCoverage: r.normalizedCoverage });
    }
  }

  const suggestions: CoordinationSuggestion[] = [];
  const AID_TYPES: AidType[] = ['food', 'medical', 'infrastructure'];
  const seen = new Set<string>();

  for (const src of sources.slice(0, 12)) {
    for (const tgt of targets.slice(0, 15)) {
      if (src.regionId === tgt.regionId) continue;
      const srcRegion = covMap.get(src.regionId)?.region;
      const tgtRegion = covMap.get(tgt.regionId)?.region;
      if (!srcRegion || !tgtRegion) continue;

      const srcEdges = getEdgesForRegion(src.regionId, data);
      const tgtEdges = getEdgesForRegion(tgt.regionId, data);
      const srcOrgs = getOrgsForRegion(src.regionId, data);

      let bestType: AidType = 'food';
      let bestGain = -1;

      for (const aidType of AID_TYPES) {
        const countInSrc = srcEdges.filter((e) => e.aidType === aidType).reduce((s, e) => s + e.projectCount, 0);
        if (countInSrc < 3) continue;

        const addResult = simulateAidAddition({
          population: tgtRegion.population,
          needLevel: tgtRegion.needLevel,
          aidEdges: tgtEdges.map((e) => ({ aidType: e.aidType, projectCount: e.projectCount })),
          additionalAid: 3,
          aidType,
        });
        if (addResult.delta > bestGain) {
          bestGain = addResult.delta;
          bestType = aidType;
        }
      }

      if (bestGain <= 0) continue;
      const key = `${src.regionId}:${tgt.regionId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      suggestions.push({
        sourceRegionId: src.regionId,
        targetRegionId: tgt.regionId,
        sourceName: srcRegion.name,
        targetName: tgtRegion.name,
        sourceCountryName: countryById.get(srcRegion.countryId)?.name ?? srcRegion.countryId,
        targetCountryName: countryById.get(tgtRegion.countryId)?.name ?? tgtRegion.countryId,
        aidType: bestType,
        projectCount: 3,
        expectedCoverageGain: bestGain,
        orgIds: srcOrgs.slice(0, 3).map((o) => o.id),
        rationale: `Redirect from high-overlap ${srcRegion.name} to critical ${tgtRegion.name}`,
      });
    }
  }

  suggestions.sort((a, b) => b.expectedCoverageGain - a.expectedCoverageGain);
  return suggestions.slice(0, 20);
}
