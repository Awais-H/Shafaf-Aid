'use client';

/**
 * Bar breakdown component for showing distributions
 */

import React from 'react';

interface BarItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface BarBreakdownProps {
  items: BarItem[];
}

export default function BarBreakdown({ items }: BarBreakdownProps) {
  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-300">{item.label}</span>
            <span className="text-sm text-gray-400">
              {item.value} ({item.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-2">No data available</p>
      )}
    </div>
  );
}
