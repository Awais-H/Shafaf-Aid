'use client';

/**
 * Header component for AidGap
 * Shows app title, navigation, and data mode indicator
 */

import React from 'react';
import Link from 'next/link';
import { useViewStore } from '@/app_state/viewStore';

export default function Header() {
  const currentView = useViewStore((state) => state.currentView);
  const selectedCountryId = useViewStore((state) => state.selectedCountryId);
  const appData = useViewStore((state) => state.appData);
  const toggleExplainDrawer = useViewStore((state) => state.toggleExplainDrawer);

  const selectedCountry = appData?.countries.find(
    (c) => c.id === selectedCountryId
  );

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: 'rgba(5, 5, 5, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'rgba(255, 255, 255, 0.06)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Title */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1 
              className="text-lg font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              Shafaf
            </h1>
          </Link>

          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 ml-4 text-sm">
            <Link
              href="/"
              className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                currentView === 'world'
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              World
            </Link>
            {selectedCountry && (
              <>
                <span style={{ color: 'rgba(255, 255, 255, 0.2)' }}>/</span>
                <span className="px-3 py-1 rounded-lg bg-white/10 text-white">
                  {selectedCountry.name}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Explain button */}
          <button
            onClick={toggleExplainDrawer}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm flex items-center gap-2"
            style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
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
