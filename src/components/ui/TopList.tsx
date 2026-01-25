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
  /** When set, the row is a clickable link opening in a new tab (e.g. org website) */
  linkUrl?: string;
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
          {displayedItems.map((item, i) => {
            const row = (
              <>
                {/* Rank badge */}
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded text-xs font-medium flex-shrink-0 ${
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
                <div className="text-right flex-shrink-0 flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-300">{item.value}</span>
                  <span className="text-xs text-gray-500">{valueLabel}</span>
                  {item.linkUrl && (
                    <svg className="w-3.5 h-3.5 text-cyan-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </div>
              </>
            );
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  item.linkUrl
                    ? 'hover:bg-slate-700/60 cursor-pointer'
                    : 'hover:bg-gray-700/50'
                }`}
              >
                {item.linkUrl ? (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 w-full min-w-0 text-inherit no-underline focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-inset rounded"
                  >
                    {row}
                  </a>
                ) : (
                  row
                )}
              </li>
            );
          })}
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
