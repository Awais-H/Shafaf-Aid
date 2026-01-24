'use client';

/**
 * Legend component for AidGap
 * Shows color scale and interpretation guide
 */

import React from 'react';
import { COVERAGE_COLORS } from '@/core/graph/constants';

interface LegendProps {
  title?: string;
  showNeedLevels?: boolean;
}

export default function Legend({ 
  title = 'Coverage Gap',
  showNeedLevels = false 
}: LegendProps) {
  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-gray-700">
      <h3 className="text-white font-semibold text-sm mb-3">{title}</h3>
      
      {/* Color gradient */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{
              backgroundColor: `rgb(${COVERAGE_COLORS.HIGH_GAP.join(',')})`,
            }}
          />
          <span className="text-gray-300 text-xs">High Gap (Low Coverage)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{
              backgroundColor: `rgb(${COVERAGE_COLORS.MEDIUM_GAP.join(',')})`,
            }}
          />
          <span className="text-gray-300 text-xs">Medium Gap</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{
              backgroundColor: `rgb(${COVERAGE_COLORS.LOW_GAP.join(',')})`,
            }}
          />
          <span className="text-gray-300 text-xs">Low Gap (Well Covered)</span>
        </div>
      </div>

      {/* Gradient bar */}
      <div className="mt-3">
        <div
          className="h-2 rounded-full"
          style={{
            background: `linear-gradient(to right, 
              rgb(${COVERAGE_COLORS.HIGH_GAP.join(',')}), 
              rgb(${COVERAGE_COLORS.MEDIUM_GAP.join(',')}), 
              rgb(${COVERAGE_COLORS.LOW_GAP.join(',')})
            )`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-gray-500 text-xs">0%</span>
          <span className="text-gray-500 text-xs">Coverage</span>
          <span className="text-gray-500 text-xs">100%</span>
        </div>
      </div>

      {/* Need levels (optional) */}
      {showNeedLevels && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <h4 className="text-gray-400 text-xs font-medium mb-2">Need Factors</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Low</span>
              <span className="text-gray-300">×0.8</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Medium</span>
              <span className="text-gray-300">×1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">High</span>
              <span className="text-gray-300">×1.3</span>
            </div>
          </div>
        </div>
      )}

      {/* Interaction hints */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="text-gray-500 text-xs space-y-1">
          <p>• Click nodes for details</p>
          <p>• Scroll to zoom</p>
          <p>• Drag to pan</p>
        </div>
      </div>
    </div>
  );
}
