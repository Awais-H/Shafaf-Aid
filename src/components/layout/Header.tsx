'use client';

/**
 * Header component for AidGap
 * Shows app title, navigation, and data mode indicator
 */

import React from 'react';
import Link from 'next/link';
import { useViewStore } from '@/app_state/viewStore';
import { getDataMode } from '@/core/data/supabaseClient';

export default function Header() {
  const currentView = useViewStore((state) => state.currentView);
  const selectedCountryId = useViewStore((state) => state.selectedCountryId);
  const appData = useViewStore((state) => state.appData);
  const toggleExplainDrawer = useViewStore((state) => state.toggleExplainDrawer);

  const dataMode = getDataMode();
  const selectedCountry = appData?.countries.find(
    (c) => c.id === selectedCountryId
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AG</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Shafaf Aid</h1>
              <p className="text-xs text-gray-400">AidGap Explorer</p>
            </div>
          </Link>

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 ml-4 text-sm">
            <Link
              href="/"
              className={`px-3 py-1 rounded-md transition-colors ${
                currentView === 'world'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              World
            </Link>
            {selectedCountry && (
              <>
                <span className="text-gray-600">/</span>
                <span className="px-3 py-1 rounded-md bg-gray-700 text-white">
                  {selectedCountry.name}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Data mode indicator */}
          <div
            className={`px-2 py-1 rounded text-xs font-medium ${
              dataMode === 'supabase'
                ? 'bg-green-900/50 text-green-400 border border-green-700'
                : 'bg-blue-900/50 text-blue-400 border border-blue-700'
            }`}
          >
            {dataMode === 'supabase' ? 'Live Data' : 'Demo Mode'}
          </div>

          {/* Explain button */}
          <button
            onClick={toggleExplainDrawer}
            className="px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-sm flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
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
            Explain
          </button>
        </div>
      </div>
    </header>
  );
}
