'use client';

/**
 * Mosque details panel: name, location, goal/raised, progress bar, emergency, campaigns
 */

import React from 'react';
import type { MosqueWithFunding } from '@/core/data/schema';

interface MosqueSidePanelProps {
  mosque: MosqueWithFunding | null;
  onClose: () => void;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function MosqueSidePanel({ mosque, onClose }: MosqueSidePanelProps) {
  if (!mosque) return null;

  const progress = mosque.goalAmount > 0 ? mosque.raisedAmount / mosque.goalAmount : 0;
  const remaining = Math.max(mosque.goalAmount - mosque.raisedAmount, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-16 bottom-0 w-96 bg-gray-900 border-l border-gray-700 z-50 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-white">{mosque.name}</h2>
            <p className="text-sm text-gray-400">
              {mosque.city}, {mosque.country}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mosque.emergencyAppeal && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-400">Emergency appeal</p>
              <p className="text-sm text-red-300/90 mt-1">{mosque.emergencyAppeal}</p>
            </div>
          )}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Raised / Goal</span>
              <span className="text-white">
                {formatCurrency(mosque.raisedAmount)} / {formatCurrency(mosque.goalAmount)}
              </span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, progress * 100)}%`,
                  backgroundColor: '#22c55e',
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(remaining)} remaining · urgency {mosque.urgency}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Necessity score</h3>
            <p className="text-xl font-bold text-white">{formatCurrency(mosque.necessityScore)}</p>
          </div>
        </div>
      </div>
    </>
  );
}
