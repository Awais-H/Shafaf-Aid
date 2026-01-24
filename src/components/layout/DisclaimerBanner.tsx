'use client';

/**
 * Disclaimer banner component
 * Communicates data interpretation guidance
 */

import React, { useState } from 'react';

export default function DisclaimerBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800/60 border-b border-gray-700/50">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-gray-300 text-sm">
              Coverage indices are relative and normalized within the current view.
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-300 text-xs underline ml-4 flex-shrink-0"
          >
            {expanded ? 'Less' : 'More info'}
          </button>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-gray-700/30 text-gray-400 text-xs space-y-1">
            <p>
              • Coverage indices indicate potential gaps, not absolute coverage levels.
            </p>
            <p>
              • This tool provides decision-support signals for humanitarian coordination.
            </p>
            <p>
              • Click "Explain" in the header to see the formulas and weights used.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
