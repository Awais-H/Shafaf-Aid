'use client';

/**
 * Header component for Shafaf Aid 2.0
 * Shows app title, navigation, search, and data mode indicator
 */

import React from 'react';
import Link from 'next/link';
import { useViewStore } from '@/app_state/viewStore';

export default function Header() {
  const currentView = useViewStore((state) => state.currentView);
  const selectedCountryId = useViewStore((state) => state.selectedCountryId);
  const appData = useViewStore((state) => state.appData);
  const toggleExplainDrawer = useViewStore((state) => state.toggleExplainDrawer);
  const toggleSearch = useViewStore((state) => state.toggleSearch);
  const toggleActionMode = useViewStore((state) => state.toggleActionMode);
  const actionModeOpen = useViewStore((state) => state.recommendations.actionModeOpen);
  const demoActive = useViewStore((state) => state.recommendations.demoActive);
  const setDemoActive = useViewStore((state) => state.setDemoActive);
  const setDemoStep = useViewStore((state) => state.setDemoStep);

  const handleDemoClick = () => {
    if (!demoActive) {
      setDemoActive(true);
      setDemoStep(0);
    } else {
      setDemoActive(false);
      setDemoStep(0);
    }
  };

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
          {/* Search button */}
          <button
            onClick={toggleSearch}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm flex items-center gap-2 font-inter"
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-white/10 rounded font-mono">⌘K</kbd>
          </button>

          {/* Demo flow */}
          <button
            onClick={handleDemoClick}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 font-inter transition-all duration-200 ${
              demoActive ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            style={demoActive ? {} : { border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <span className="hidden sm:inline">{demoActive ? 'Demo on' : 'Demo'}</span>
          </button>

          {/* Action Mode / Recommendations */}
          <button
            onClick={toggleActionMode}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 font-inter transition-all duration-200 ${
              actionModeOpen
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            style={actionModeOpen ? {} : { border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="hidden sm:inline">Action Mode</span>
          </button>

          {/* Explain button */}
          <button
            onClick={toggleExplainDrawer}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200 text-sm flex items-center gap-2 font-inter"
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
