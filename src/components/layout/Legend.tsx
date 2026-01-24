'use client';

/**
 * Legend component
 * Shows minimal color scale bar
 */

import React from 'react';
import { COVERAGE_COLORS } from '@/core/graph/constants';

export default function Legend() {
  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-700">
      {/* Gradient bar */}
      <div
        className="h-2 w-32 rounded-full"
        style={{
          background: `linear-gradient(to right, 
            rgb(${COVERAGE_COLORS.HIGH_GAP.join(',')}), 
            rgb(${COVERAGE_COLORS.MEDIUM_GAP.join(',')}), 
            rgb(${COVERAGE_COLORS.LOW_GAP.join(',')})
          )`,
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-gray-500 text-[10px]">High Gap</span>
        <span className="text-gray-500 text-[10px]">Low Gap</span>
      </div>
    </div>
  );
}
