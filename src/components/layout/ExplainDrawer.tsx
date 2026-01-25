'use client';

/**
 * Explain drawer component for AidGap
 * Shows formulas, weights, and methodology documentation
 */

import React from 'react';
import { useViewStore } from '@/app_state/viewStore';
import { FORMULAS, AID_TYPE_WEIGHTS, NEED_FACTORS } from '@/core/graph/constants';

export default function ExplainDrawer() {
  const explainDrawerOpen = useViewStore((state) => state.explainDrawerOpen);
  const toggleExplainDrawer = useViewStore((state) => state.toggleExplainDrawer);

  if (!explainDrawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
        onClick={toggleExplainDrawer}
      />

      {/* Drawer */}
      <div 
        className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full z-50 overflow-hidden flex flex-col"
        style={{
          background: '#0A0A0A',
          boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4"
          style={{
            background: 'rgba(15, 15, 15, 0.9)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div>
            <h2 className="text-xl font-bold text-white">Methodology</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Formulas, weights, and assumptions
            </p>
          </div>
          <button
            onClick={toggleExplainDrawer}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Coverage Index */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">
              {FORMULAS.COVERAGE_INDEX.name}
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-green-400 mb-3">
              {FORMULAS.COVERAGE_INDEX.formula}
            </div>
            <p className="text-gray-300 text-sm mb-4">
              {FORMULAS.COVERAGE_INDEX.description}
            </p>

            <h4 className="text-sm font-medium text-gray-400 mb-2">Components</h4>
            <div className="space-y-3">
              {FORMULAS.COVERAGE_INDEX.components.map((comp, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-3">
                  <div className="font-medium text-white text-sm">{comp.name}</div>
                  <div className="font-mono text-xs text-blue-400 mt-1">
                    {comp.formula}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    {comp.description}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Aid Type Weights */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">
              Aid Type Weights
            </h3>
            <p className="text-gray-300 text-sm mb-3">
              Different aid types are weighted to reflect their relative impact on
              coverage assessment:
            </p>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">
                      Aid Type
                    </th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">
                      Weight
                    </th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">
                      Rationale
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-700/50">
                    <td className="px-4 py-2 text-white">Food</td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {AID_TYPE_WEIGHTS.food}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      Baseline weight for essential aid
                    </td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="px-4 py-2 text-white">Medical</td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {AID_TYPE_WEIGHTS.medical}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      Higher weight for critical healthcare
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-white">Infrastructure</td>
                    <td className="px-4 py-2 text-right text-green-400">
                      {AID_TYPE_WEIGHTS.infrastructure}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      Lower weight for longer-term projects
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Need Factors */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Need Factors</h3>
            <p className="text-gray-300 text-sm mb-3">
              Need factors adjust the denominator — higher need increases the
              "required" coverage, making the same aid presence result in a lower
              coverage index:
            </p>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">
                      Need Level
                    </th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">
                      Factor
                    </th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">
                      Effect
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-700/50">
                    <td className="px-4 py-2 text-white">Low</td>
                    <td className="px-4 py-2 text-right text-blue-400">
                      ×{NEED_FACTORS.low}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      Reduces required coverage
                    </td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="px-4 py-2 text-white">Medium</td>
                    <td className="px-4 py-2 text-right text-blue-400">
                      ×{NEED_FACTORS.medium}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      Baseline (no adjustment)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-white">High</td>
                    <td className="px-4 py-2 text-right text-blue-400">
                      ×{NEED_FACTORS.high}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      Increases required coverage
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Normalization */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">
              {FORMULAS.NORMALIZATION.name}
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-green-400 mb-3">
              {FORMULAS.NORMALIZATION.formula}
            </div>
            <p className="text-gray-300 text-sm">
              {FORMULAS.NORMALIZATION.description}
            </p>
            <div className="mt-3 bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                <strong>Important:</strong> Normalized values are always relative
                to the current view. A region with 80% normalized coverage in one
                country view may have a different normalized value when viewed
                globally.
              </p>
            </div>
          </section>

          {/* Overlap Intensity */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">
              {FORMULAS.OVERLAP_INTENSITY.name}
            </h3>
            <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm text-green-400 mb-3">
              {FORMULAS.OVERLAP_INTENSITY.formula}
            </div>
            <p className="text-gray-300 text-sm">
              {FORMULAS.OVERLAP_INTENSITY.description}
            </p>
          </section>

          {/* Graph Model */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-3">Graph Model</h3>
            <p className="text-gray-300 text-sm mb-3">
              This tool uses a bipartite graph model to represent aid coverage:
            </p>
            <div className="bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-300">
                  <strong>Nodes:</strong> Countries, Regions, Organizations
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-500" />
                <span className="text-gray-300">
                  <strong>Edges:</strong> Organization → Region (aid presence)
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-3">
              Graph operations include degree centrality (overlap intensity),
              coverage variance by region, and bipartite projections for
              organization similarity analysis.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4"
          style={{
            background: 'rgba(15, 15, 15, 0.9)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <p style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '12px' }}>
            For questions about methodology, contact the development team or refer
            to the project documentation.
          </p>
        </div>
      </div>
    </>
  );
}
