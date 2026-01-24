'use client';

/**
 * Top list component for showing ranked items
 */

import React, { useState } from 'react';

interface ListItem {
  id: string;
  name: string;
  value: number;
  subtext?: string;
}

interface TopListProps {
  items: ListItem[];
  maxItems?: number;
  valueLabel?: string;
}

export default function TopList({
  items,
  maxItems = 10,
  valueLabel = 'projects',
}: TopListProps) {
  const [showAll, setShowAll] = useState(false);
  
  const displayedItems = showAll ? items : items.slice(0, maxItems);
  const hasMore = items.length > maxItems;

  return (
    <div>
      <div className="max-h-64 overflow-y-auto">
        <ul className="space-y-2">
          {displayedItems.map((item, i) => (
            <li
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              {/* Rank badge */}
              <span
                className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium ${
                  i < 3
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {i + 1}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{item.name}</div>
                {item.subtext && (
                  <div className="text-xs text-gray-500 truncate">{item.subtext}</div>
                )}
              </div>

              {/* Value */}
              <div className="text-right">
                <span className="text-sm font-medium text-gray-300">{item.value}</span>
                <span className="text-xs text-gray-500 ml-1">{valueLabel}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${items.length} items`}
        </button>
      )}

      {items.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-4">No items to display</p>
      )}
    </div>
  );
}
