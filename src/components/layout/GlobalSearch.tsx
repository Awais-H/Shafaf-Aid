'use client';

/**
 * Global Search Component (CMD+K)
 * Quick search for regions and organizations
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useViewStore } from '@/app_state/viewStore';
import { useSearchItems, type SearchItem } from '@/app_state/selectors';

// Icons
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const RegionIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const OrgIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default function GlobalSearch() {
  const router = useRouter();
  const searchOpen = useViewStore((state) => state.searchOpen);
  const toggleSearch = useViewStore((state) => state.toggleSearch);
  const selectRegion = useViewStore((state) => state.selectRegion);
  const appData = useViewStore((state) => state.appData);
  
  const searchItems = useSearchItems();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter results
  const filteredItems = query.length > 0
    ? searchItems.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : searchItems.slice(0, 8); // Show recent/featured when no query

  // Handle keyboard shortcut (CMD+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleSearch();
      }
      if (e.key === 'Escape' && searchOpen) {
        toggleSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSearch, searchOpen]);

  // Focus input when opened
  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  }, [filteredItems, selectedIndex]);

  // Handle selection
  const handleSelect = useCallback((item: SearchItem) => {
    toggleSearch();
    
    if (item.type === 'region' && item.countryId) {
      // Navigate to country page and select region
      router.push(`/country/${item.countryId}`);
      // Delay region selection to allow page load
      setTimeout(() => selectRegion(item.id), 500);
    } else if (item.type === 'organization') {
      // For organizations, find their first region presence
      const edge = appData?.aidEdges.find((e) => e.orgId === item.id);
      if (edge) {
        const region = appData?.regions.find((r) => r.id === edge.regionId);
        if (region) {
          router.push(`/country/${region.countryId}`);
          setTimeout(() => selectRegion(region.id), 500);
        }
      }
    }
  }, [router, selectRegion, toggleSearch, appData]);

  if (!searchOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={toggleSearch}
      />

      {/* Search Dialog */}
      <div className="fixed inset-x-4 top-[15vh] mx-auto max-w-xl z-50">
        <div className="bg-slate-900/95 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60">
            <span className="text-slate-400">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search regions, organizations..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none font-inter text-sm"
            />
            <kbd className="hidden sm:block px-2 py-0.5 text-xs text-slate-500 bg-slate-800 rounded border border-slate-700 font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto py-2">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No results found for "{query}"
              </div>
            ) : (
              <ul>
                {filteredItems.map((item, index) => (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-cyan-500/15 text-white'
                          : 'text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className={`flex-shrink-0 ${
                        item.type === 'region' ? 'text-emerald-400' : 'text-blue-400'
                      }`}>
                        {item.type === 'region' ? <RegionIcon /> : <OrgIcon />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.name}</div>
                        <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                      </div>
                      <span className="flex-shrink-0 text-xs text-slate-600 uppercase tracking-wider font-mono">
                        {item.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-slate-700/60 text-xs text-slate-500 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">⌘K</kbd>
              Toggle
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
