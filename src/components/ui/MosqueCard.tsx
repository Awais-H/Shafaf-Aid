'use client';

import React from 'react';
import type { MosqueWithFunding } from '@/core/data/schema';

interface MosqueCardProps {
  mosque: MosqueWithFunding;
  onClick: () => void;
  selected?: boolean;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function MosqueCard({ mosque, onClick, selected }: MosqueCardProps) {
  const progress = mosque.goalAmount > 0 ? mosque.raisedAmount / mosque.goalAmount : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors flex flex-col items-stretch gap-1 group ${
        selected ? 'bg-gray-700' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm truncate flex-1 ${selected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
          {mosque.name}
        </span>
        {mosque.emergencyAppeal && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 flex-shrink-0">
            Emergency
          </span>
        )}
      </div>
      <div className="text-gray-500 text-xs">{mosque.city}, {mosque.country}</div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formatCurrency(mosque.raisedAmount)} / {formatCurrency(mosque.goalAmount)}</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, progress * 100)}%`, backgroundColor: '#22c55e' }}
        />
      </div>
    </button>
  );
}
