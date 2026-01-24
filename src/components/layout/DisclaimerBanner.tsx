'use client';

/**
 * Disclaimer banner component for AidGap
 * Always visible to communicate data limitations
 */

import React, { useState } from 'react';

export default function DisclaimerBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-amber-900/40 border-b border-amber-700/50">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-amber-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-amber-200 text-sm">
              <strong>Demo Mode:</strong> This visualization uses synthetic data for
              demonstration purposes only.
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-amber-400 hover:text-amber-300 text-xs underline ml-4 flex-shrink-0"
          >
            {expanded ? 'Less' : 'More info'}
          </button>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-amber-700/30 text-amber-200/80 text-xs space-y-1">
            <p>
              • Coverage indices are <strong>relative</strong> and{' '}
              <strong>normalized within the current view</strong> — they indicate
              potential gaps, not absolute coverage levels.
            </p>
            <p>
              • This tool provides <strong>decision-support signals</strong> for
              humanitarian coordination, not authoritative coverage assessments.
            </p>
            <p>
              • Real-world aid coverage depends on many factors not captured in
              this model, including access constraints, funding cycles, and local
              capacity.
            </p>
            <p>
              • Click "Explain" in the header to see the formulas and weights used
              in these calculations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
