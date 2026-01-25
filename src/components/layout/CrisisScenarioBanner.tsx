'use client';

/**
 * Crisis Scenario Banner
 * Shown when a scenario (conflict escalation, displacement, etc.) is enabled
 */

import React from 'react';
import { useViewStore } from '@/app_state/viewStore';

const LABELS: Record<string, string> = {
  none: '',
  conflict_escalation: 'Conflict escalation',
  population_displacement: 'Population displacement',
  infrastructure_collapse: 'Infrastructure collapse',
};

export default function CrisisScenarioBanner() {
  const scenarioMode = useViewStore((state) => state.recommendations.scenarioMode);
  const label = LABELS[scenarioMode] ?? '';

  if (scenarioMode === 'none' || !label) return null;

  return (
    <div
      className="fixed left-0 right-0 flex items-center justify-center gap-2 px-4 py-2 border-b border-amber-700/40 z-[45]"
      style={{
        top: 56,
        background: 'linear-gradient(90deg, rgba(180,83,9,0.2) 0%, rgba(180,83,9,0.08) 100%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span className="text-sm font-medium text-amber-400">Scenario mode: {label}</span>
      <span className="text-xs text-amber-500/80">Urgency & recommendations updated</span>
    </div>
  );
}
