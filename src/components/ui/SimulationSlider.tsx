'use client';

/**
 * Simulation Slider Component
 * "What-If" analysis for aid allocation simulation
 */

import React, { useCallback } from 'react';
import { useViewStore } from '@/app_state/viewStore';
import { useSimulatedCoverage } from '@/app_state/selectors';
import type { AidType } from '@/core/data/schema';

const AID_TYPE_LABELS: Record<AidType, { label: string; color: string }> = {
  food: { label: 'Food', color: 'bg-emerald-500' },
  medical: { label: 'Medical', color: 'bg-red-500' },
  infrastructure: { label: 'Infrastructure', color: 'bg-sky-500' },
};

export default function SimulationSlider() {
  const simulation = useViewStore((state) => state.simulation);
  const regionDetail = useViewStore((state) => state.regionDetail);
  const setSimulationEnabled = useViewStore((state) => state.setSimulationEnabled);
  const setSimulationAid = useViewStore((state) => state.setSimulationAid);
  const setSimulationAidType = useViewStore((state) => state.setSimulationAidType);
  const resetSimulation = useViewStore((state) => state.resetSimulation);
  
  const simulatedResult = useSimulatedCoverage();

  const handleToggle = useCallback(() => {
    setSimulationEnabled(!simulation.enabled);
  }, [simulation.enabled, setSimulationEnabled]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSimulationAid(parseInt(e.target.value, 10));
  }, [setSimulationAid]);

  const handleTypeChange = useCallback((type: AidType) => {
    setSimulationAidType(type);
  }, [setSimulationAidType]);

  if (!regionDetail) return null;

  const currentIndex = simulatedResult?.current.rawIndex ?? regionDetail.coverageIndex;
  const simulatedIndex = simulatedResult?.simulated.rawIndex ?? currentIndex;
  const percentChange = simulatedResult?.percentageChange ?? 0;

  return (
    <div className="bg-slate-900/80 border border-slate-700/40 rounded-lg p-4 space-y-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-slate-300 uppercase tracking-wider">
            Simulate Aid
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">What-if analysis</p>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            simulation.enabled ? 'bg-cyan-500' : 'bg-slate-700'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              simulation.enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {simulation.enabled && (
        <>
          {/* Aid Type Selector */}
          <div className="flex gap-2">
            {(Object.entries(AID_TYPE_LABELS) as [AidType, { label: string; color: string }][]).map(
              ([type, { label, color }]) => (
                <button
                  key={type}
                  onClick={() => handleTypeChange(type)}
                  className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                    simulation.aidType === type
                      ? `${color} text-white`
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              )
            )}
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Additional Projects</span>
              <span className="font-mono text-cyan-400">{simulation.additionalAid}</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={simulation.additionalAid}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
            <div className="flex justify-between text-xs text-slate-600">
              <span>0</span>
              <span>50</span>
            </div>
          </div>

          {/* Dual Progress Bar: Current vs Simulated */}
          <div className="space-y-2">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Coverage Index</div>
            
            {/* Current */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-16">Current</span>
              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(currentIndex * 10, 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-400 w-14 text-right tabular-nums">
                {currentIndex.toFixed(3)}
              </span>
            </div>

            {/* Simulated */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-cyan-400 w-16">Target</span>
              <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(simulatedIndex * 10, 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-cyan-400 w-14 text-right tabular-nums">
                {simulatedIndex.toFixed(3)}
              </span>
            </div>

            {/* Change indicator */}
            {simulation.additionalAid > 0 && (
              <div className="flex items-center justify-end gap-2 text-xs">
                <span className={percentChange > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                  {percentChange > 0 ? '↑' : '→'} {Math.abs(percentChange).toFixed(1)}% change
                </span>
              </div>
            )}
          </div>

          {/* Reset button */}
          <button
            onClick={resetSimulation}
            className="w-full py-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded transition-colors"
          >
            Reset Simulation
          </button>
        </>
      )}
    </div>
  );
}
