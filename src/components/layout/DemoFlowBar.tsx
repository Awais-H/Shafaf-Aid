'use client';

/**
 * Guided Demo Flow Bar
 * Step-by-step hackathon demo: world map → crisis scenario → recommendations → before/after → region
 */

import React, { useCallback } from 'react';
import { useViewStore } from '@/app_state/viewStore';

const STEPS = [
  { title: 'World map', desc: 'Ukraine & Palestine highlighted. Select a country to explore regions.' },
  { title: 'Crisis scenario', desc: 'Open Action Mode → set "Conflict escalation" → urgency & map update.' },
  { title: 'Generate recommendations', desc: 'Click "Generate Action Plan" → priority list & deployment table.' },
  { title: 'Before vs after', desc: 'View impact summary. Global coverage gap reduced.' },
  { title: 'Open a region', desc: 'Click Gaza, Donetsk, or any region → coverage, recommended aid, simulation.' },
];

export default function DemoFlowBar() {
  const demoActive = useViewStore((state) => state.recommendations.demoActive);
  const demoStep = useViewStore((state) => state.recommendations.demoStep);
  const setDemoStep = useViewStore((state) => state.setDemoStep);
  const setDemoActive = useViewStore((state) => state.setDemoActive);
  const toggleActionMode = useViewStore((state) => state.toggleActionMode);
  const setScenarioMode = useViewStore((state) => state.setScenarioMode);

  const handleNext = useCallback(() => {
    if (demoStep >= STEPS.length - 1) {
      setDemoActive(false);
      setDemoStep(0);
      return;
    }
    const next = demoStep + 1;
    setDemoStep(next);
    if (next === 1) {
      setScenarioMode('conflict_escalation');
      toggleActionMode();
    }
  }, [demoStep, setDemoStep, setDemoActive, setScenarioMode, toggleActionMode]);

  if (!demoActive) return null;

  const step = STEPS[Math.min(demoStep, STEPS.length - 1)];

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-3 rounded-xl border border-cyan-500/40 bg-slate-900/95 backdrop-blur-md shadow-xl"
      style={{ maxWidth: 'min(90vw, 560px)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
          Step {demoStep + 1} of {STEPS.length}
        </div>
        <div className="text-sm font-medium text-white truncate">{step.title}</div>
        <div className="text-xs text-slate-400 truncate">{step.desc}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => { setDemoActive(false); setDemoStep(0); }}
          className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
        >
          End demo
        </button>
        <button
          onClick={handleNext}
          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-colors"
        >
          {demoStep >= STEPS.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
