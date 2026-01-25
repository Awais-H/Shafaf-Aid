'use client';

/**
 * Legend component
 * Shows minimal color scale bar with glassmorphism styling
 */

import React from 'react';
import { COVERAGE_COLORS } from '@/core/graph/constants';

export default function Legend() {
  return (
    <div 
      className="rounded-xl px-4 py-3"
      style={{
        background: 'rgba(10, 10, 10, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Gradient bar */}
      <div
        className="h-2 w-36 rounded-full"
        style={{
          background: `linear-gradient(to right, 
            rgb(${COVERAGE_COLORS.HIGH_GAP.join(',')}), 
            rgb(${COVERAGE_COLORS.MEDIUM_GAP.join(',')}), 
            rgb(${COVERAGE_COLORS.LOW_GAP.join(',')})
          )`,
        }}
      />
      <div className="flex justify-between mt-1.5">
        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '10px' }}>High Gap</span>
        <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '10px' }}>Low Gap</span>
      </div>
    </div>
  );
}
