'use client';

/**
 * Action Mode / Recommendations Panel
 * Priority regions, deployment plan, coordination suggestions, Generate Action Plan
 */

import React, { useCallback } from 'react';
import { useViewStore } from '@/app_state/viewStore';
import { useUrgencyRanking, useAidOptimization, useCoordinationSuggestions } from '@/app_state/selectors';
import { CRISIS_SCENARIOS, type CrisisScenario } from '@/core/graph/constants';

const SCENARIO_LABELS: Record<CrisisScenario, string> = {
  none: 'None',
  conflict_escalation: 'Conflict escalation',
  population_displacement: 'Population displacement',
  infrastructure_collapse: 'Infrastructure collapse',
};

export default function ActionModePanel() {
  const actionModeOpen = useViewStore((state) => state.recommendations.actionModeOpen);
  const scenarioMode = useViewStore((state) => state.recommendations.scenarioMode);
  const availableAidBudget = useViewStore((state) => state.recommendations.availableAidBudget);
  const actionPlanGenerated = useViewStore((state) => state.recommendations.actionPlanGenerated);
  const deploymentPlan = useViewStore((state) => state.recommendations.deploymentPlan);
  const coordinationSuggestions = useViewStore((state) => state.recommendations.coordinationSuggestions);
  const beforeAfterMetrics = useViewStore((state) => state.recommendations.beforeAfterMetrics);
  const beforeAfterView = useViewStore((state) => state.recommendations.beforeAfterView);

  const toggleActionMode = useViewStore((state) => state.toggleActionMode);
  const setBeforeAfterView = useViewStore((state) => state.setBeforeAfterView);
  const setScenarioMode = useViewStore((state) => state.setScenarioMode);
  const setAvailableAidBudget = useViewStore((state) => state.setAvailableAidBudget);
  const setActionPlanGenerated = useViewStore((state) => state.setActionPlanGenerated);
  const setPriorityRegions = useViewStore((state) => state.setPriorityRegions);
  const setDeploymentPlan = useViewStore((state) => state.setDeploymentPlan);
  const setCoordinationSuggestions = useViewStore((state) => state.setCoordinationSuggestions);
  const setBeforeAfterMetrics = useViewStore((state) => state.setBeforeAfterMetrics);

  const priorityRegions = useUrgencyRanking();
  const deployment = useAidOptimization();
  const coordination = useCoordinationSuggestions();

  const handleGeneratePlan = useCallback(() => {
    setPriorityRegions(priorityRegions.slice(0, 10));
    setDeploymentPlan(deployment);
    setCoordinationSuggestions(coordination);
    const totalImprovement = deployment.reduce((s, d) => s + d.coverageImprovement, 0);
    const criticalLifted = deployment
      .filter((d) => priorityRegions.some((p) => p.regionId === d.regionId && p.normalizedCoverage < 0.33))
      .map((d) => d.regionId);
    const countriesImproved = [...new Set(deployment.map((d) => d.countryId))];
    setBeforeAfterMetrics({
      globalCoverageBefore: 0.5,
      globalCoverageAfter: 0.5 + totalImprovement * 0.01,
      improvementPercent: Math.min(100, totalImprovement * 2),
      countriesImproved,
      regionsLiftedCritical: criticalLifted,
    });
    setActionPlanGenerated(true);
  }, [
    priorityRegions,
    deployment,
    coordination,
    setPriorityRegions,
    setDeploymentPlan,
    setCoordinationSuggestions,
    setBeforeAfterMetrics,
    setActionPlanGenerated,
  ]);

  const handleExportJSON = useCallback(() => {
    const report = {
      generated: new Date().toISOString(),
      scenario: scenarioMode,
      availableBudget: availableAidBudget,
      priorityRegions: priorityRegions.slice(0, 10),
      deploymentPlan: deployment,
      coordinationSuggestions: coordination,
      impact: beforeAfterMetrics,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shafaf-action-plan-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [scenarioMode, availableAidBudget, priorityRegions, deployment, coordination, beforeAfterMetrics]);

  const handleExportCSV = useCallback(() => {
    const rows: string[] = ['Region,Country,Aid Type,Projects,Coverage Improvement,Rationale'];
    const data = deploymentPlan.length ? deploymentPlan : deployment;
    for (const d of data) {
      rows.push(
        `"${d.regionName}","${d.countryName}","${d.aidType}",${d.projects},${d.coverageImprovement.toFixed(4)},"${d.rationale.replace(/"/g, '""')}"`
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `shafaf-deployment-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [deploymentPlan, deployment]);

  if (!actionModeOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={toggleActionMode} />
      <div className="fixed left-0 top-16 bottom-0 w-[420px] max-w-[95vw] glass z-50 overflow-hidden flex flex-col border-r border-slate-700/60">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-900/80">
          <div>
            <h2 className="text-lg font-semibold text-white">Action Mode</h2>
            <p className="text-xs text-slate-500">Recommendations & deployment</p>
          </div>
          <button
            onClick={toggleActionMode}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Crisis Scenario */}
          <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700/40">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-2">Crisis scenario</h3>
            <select
              value={scenarioMode}
              onChange={(e) => setScenarioMode(e.target.value as CrisisScenario)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono"
            >
              {(Object.keys(SCENARIO_LABELS) as CrisisScenario[]).map((k) => (
                <option key={k} value={k}>
                  {SCENARIO_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Available Aid Budget */}
          <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700/40">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-2">
              Available new aid budget (projects)
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="50"
                value={availableAidBudget}
                onChange={(e) => setAvailableAidBudget(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <span className="text-sm font-mono tabular-nums text-cyan-400 w-10">{availableAidBudget}</span>
            </div>
          </div>

          {/* Top priority regions */}
          <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700/40">
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-3">
              Top 10 critical regions
            </h3>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
              {priorityRegions.slice(0, 10).map((r, i) => (
                <li
                  key={r.regionId}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-800/50 border border-slate-700/30"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-mono text-slate-500 mr-2">#{i + 1}</span>
                    <span className="text-sm text-white truncate">{r.regionName}</span>
                    <span className="text-xs text-slate-500 block truncate">{r.countryName}</span>
                  </div>
                  <span
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      r.normalizedCoverage < 0.33 ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'
                    }`}
                  >
                    {(r.urgencyScore).toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Generate Action Plan */}
          <button
            onClick={handleGeneratePlan}
            className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Generate Action Plan
          </button>

          {actionPlanGenerated && (
            <>
              {/* Deployment plan */}
              <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700/40">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-3">
                  Recommended deployments
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {deploymentPlan.length === 0 ? (
                    <p className="text-sm text-slate-500">No deployments generated.</p>
                  ) : (
                    deploymentPlan.map((d) => (
                      <div
                        key={`${d.regionId}-${d.aidType}`}
                        className="flex items-center gap-2 py-2 px-2 rounded bg-slate-800/50 text-xs"
                      >
                        <span className="font-medium text-white truncate flex-1">{d.regionName}</span>
                        <span className="text-cyan-400 font-mono">{d.aidType}</span>
                        <span className="font-mono text-slate-400">{d.projects}</span>
                        <span className="text-emerald-400 font-mono">+{(d.coverageImprovement * 100).toFixed(2)}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Coordination */}
              <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700/40">
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider mb-3">
                  Coordination opportunities
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {coordinationSuggestions.length === 0 ? (
                    <p className="text-sm text-slate-500">No suggestions.</p>
                  ) : (
                    coordinationSuggestions.slice(0, 8).map((c, i) => (
                      <div key={i} className="py-1.5 px-2 rounded bg-slate-800/50 text-xs">
                        <div className="text-slate-400">
                          {c.sourceName} → {c.targetName}
                        </div>
                        <div className="text-cyan-400 font-mono mt-0.5">
                          {c.projectCount} {c.aidType} · +{(c.expectedCoverageGain * 100).toFixed(2)}%
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Before / After Toggle */}
              {beforeAfterMetrics && (
                <div className="flex rounded-lg overflow-hidden border border-slate-700/40">
                  <button
                    onClick={() => setBeforeAfterView('before')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      beforeAfterView === 'before'
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                    }`}
                  >
                    Before
                  </button>
                  <button
                    onClick={() => setBeforeAfterView('after')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      beforeAfterView === 'after'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                    }`}
                  >
                    After
                  </button>
                </div>
              )}

              {/* Impact */}
              {beforeAfterMetrics && (
                <div className="bg-emerald-950/30 rounded-lg p-4 border border-emerald-700/40">
                  <h3 className="text-sm font-medium text-emerald-300 uppercase tracking-wider mb-2">
                    Impact summary
                  </h3>
                  <div className="space-y-1 text-sm font-mono tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Global coverage improvement</span>
                      <span className="text-emerald-400">+{beforeAfterMetrics.improvementPercent.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Countries improved</span>
                      <span className="text-white">{beforeAfterMetrics.countriesImproved.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Regions lifted critical</span>
                      <span className="text-white">{beforeAfterMetrics.regionsLiftedCritical.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Export */}
              <div className="flex gap-2">
                <button
                  onClick={handleExportJSON}
                  className="flex-1 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-sm text-slate-300 transition-colors"
                >
                  Export JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-sm text-slate-300 transition-colors"
                >
                  Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
